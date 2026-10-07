const express = require('express');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

const inferThreadIds = (user, patientId, doctorId, from, to) => {
  const nextPatientId = patientId || (user.role === 'patient' ? user.id : null) || (from && to && String(from) === String(user.id) ? String(user.id) : null);
  const nextDoctorId = doctorId || (user.role === 'doctor' ? user.id : null) || (from && to && String(to) === String(user.id) ? String(to) : null);

  if (!nextPatientId && from && to && String(from) !== String(user.id)) {
    return { patientId: String(from), doctorId: String(to) };
  }

  if (!nextDoctorId && from && to && String(to) !== String(user.id)) {
    return { patientId: String(from), doctorId: String(to) };
  }

  return { patientId: nextPatientId, doctorId: nextDoctorId };
};

router.get('/conversations', auth, async (req, res) => {
  try {
    const query = req.user.role === 'doctor'
      ? { doctorId: req.user.id }
      : { patientId: req.user.id };

    const messages = await Message.find(query).sort({ createdAt: -1 }).lean();
    const threads = new Map();

    for (const message of messages) {
      const patientId = message.patientId
        ? String(message.patientId)
        : req.user.role === 'patient'
          ? String(req.user.id)
          : String(message.from || message.to);

      const doctorId = message.doctorId
        ? String(message.doctorId)
        : req.user.role === 'doctor'
          ? String(req.user.id)
          : String(message.to || message.from);

      if (!patientId || !doctorId) continue;

      const threadKey = [patientId, doctorId].sort().join(':');
      const existing = threads.get(threadKey) || {
        patientId,
        doctorId,
        lastMessage: '',
        lastMessageAt: new Date(0),
        unreadCount: 0,
      };

      if (!existing.lastMessage || new Date(message.createdAt) > new Date(existing.lastMessageAt)) {
        existing.lastMessage = message.text;
        existing.lastMessageAt = message.createdAt;
      }

      if (String(message.to) === String(req.user.id) && !message.read) {
        existing.unreadCount += 1;
      }

      threads.set(threadKey, existing);
    }

    const userIds = [...new Set([...threads.values()].flatMap((thread) => [thread.patientId, thread.doctorId]))];
    const users = await User.find({ _id: { $in: userIds } }, '_id name role').lean();
    const userMap = new Map(users.map((user) => [String(user._id), user]));

    const conversationList = [...threads.values()]
      .map((thread) => {
        const patient = userMap.get(thread.patientId);
        const doctor = userMap.get(thread.doctorId);
        return {
          patientId: thread.patientId,
          doctorId: thread.doctorId,
          patientName: patient?.name || 'Patient',
          doctorName: doctor?.name || 'Doctor',
          lastMessage: thread.lastMessage || 'No messages yet',
          lastMessageAt: thread.lastMessageAt,
          unreadCount: thread.unreadCount || 0,
        };
      })
      .sort((left, right) => new Date(right.lastMessageAt) - new Date(left.lastMessageAt));

    res.json(conversationList);
  } catch (err) {
    console.error('Message conversations error:', err);
    res.status(500).json({ msg: 'Could not load conversations' });
  }
});

router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const other = req.params.userId;

    const messages = await Message.find({
      $or: [
        { patientId: req.user.id, doctorId: other },
        { patientId: other, doctorId: req.user.id },
        { from: req.user.id, to: other },
        { from: other, to: req.user.id },
      ],
    }).sort({ createdAt: 1 }).lean();

    await Message.updateMany(
      { from: other, to: req.user.id, read: false },
      { $set: { read: true } },
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/send', auth, async (req, res) => {
  try {
    const { doctorId, patientId, text, recipientId } = req.body;
    const safeText = String(text || '').trim();

    if (!safeText) {
      return res.status(400).json({ msg: 'Message cannot be empty.' });
    }

    const senderId = String(req.user.id);
    const candidate = inferThreadIds(req.user, patientId, doctorId, req.user.id, recipientId || doctorId || patientId);
    const normalizedPatientId = candidate.patientId ? String(candidate.patientId) : null;
    const normalizedDoctorId = candidate.doctorId ? String(candidate.doctorId) : null;

    if (!normalizedPatientId || !normalizedDoctorId) {
      return res.status(400).json({ msg: 'Patient and doctor are required for a private message.' });
    }

    if (req.user.role === 'patient' && senderId !== normalizedPatientId) {
      return res.status(403).json({ msg: 'You can only send messages from your own patient account.' });
    }

    if (req.user.role === 'doctor' && senderId !== normalizedDoctorId) {
      return res.status(403).json({ msg: 'You can only send replies from your own doctor account.' });
    }

    const recipientUserId = recipientId || (senderId === normalizedPatientId ? normalizedDoctorId : normalizedPatientId);

    const message = await Message.create({
      patientId: normalizedPatientId,
      doctorId: normalizedDoctorId,
      from: senderId,
      to: recipientUserId,
      text: safeText,
      read: false,
      senderRole: req.user.role,
    });

    await Notification.create({
      user: recipientUserId,
      title: 'New message',
      message: `${req.user.role === 'patient' ? 'A patient' : 'A doctor'} sent you a message in CureLink.`,
      type: 'message',
      read: false,
    });

    res.status(200).json({
      msg: 'Message sent.',
      message: message.text,
      messageRecord: message,
      conversation: {
        patientId: normalizedPatientId,
        doctorId: normalizedDoctorId,
      },
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ msg: 'Could not send message' });
  }
});

router.patch('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.messageId, to: req.user.id },
      { read: true },
      { new: true },
    );

    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    res.json(message);
  } catch (err) {
    console.error('Mark message read error:', err);
    res.status(500).json({ msg: 'Could not update message' });
  }
});

module.exports = router;
