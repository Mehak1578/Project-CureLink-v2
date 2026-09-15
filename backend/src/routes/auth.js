const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

const router = express.Router();

const profileFields = ['name', 'email', 'phone', 'dateOfBirth', 'gender', 'address', 'bloodGroup', 'allergies', 'existingConditions', 'emergencyContactName', 'emergencyContactNumber'];
const notificationFields = ['appointmentReminders', 'appointmentUpdates', 'reportUpdates', 'emailNotifications'];

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  dateOfBirth: user.dateOfBirth || '',
  gender: user.gender || '',
  address: user.address || '',
  bloodGroup: user.bloodGroup || '',
  allergies: user.allergies || '',
  existingConditions: user.existingConditions || '',
  emergencyContactName: user.emergencyContactName || '',
  emergencyContactNumber: user.emergencyContactNumber || '',
  isActive: user.isActive !== false,
  verificationStatus: user.verificationStatus || (user.role === 'doctor' ? 'pending' : 'verified'),
  notificationPreferences: user.notificationPreferences || {},
  healthcarePreferences: user.healthcarePreferences || {},
});

router.get('/profile', auth, async (req, res) => {
  res.json(serializeUser(req.user));
});

router.put('/profile', auth, async (req, res) => {
  try {
    profileFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) req.user[field] = String(req.body[field] || '').trim();
    });
    if (req.body.notificationPreferences) {
      notificationFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body.notificationPreferences, field)) req.user.notificationPreferences[field] = Boolean(req.body.notificationPreferences[field]);
      });
    }
    if (req.body.healthcarePreferences) {
      ['consultationType', 'language', 'communicationMethod'].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body.healthcarePreferences, field)) req.user.healthcarePreferences[field] = String(req.body.healthcarePreferences[field] || '').trim();
      });
    }
    await req.user.save();
    res.json(serializeUser(req.user));
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ msg: 'That email address is already in use' });
    res.status(500).json({ msg: 'Could not update profile' });
  }
});

router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !currentPassword) return res.status(400).json({ msg: 'Current password is required.' });
    if (typeof newPassword !== 'string' || !newPassword) return res.status(400).json({ msg: 'New password is required.' });
    if (newPassword.length < 8) return res.status(400).json({ msg: 'Password must be at least 8 characters.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ msg: 'Authentication required.' });
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ msg: 'Current password is incorrect.' });
    if (currentPassword === newPassword) return res.status(400).json({ msg: 'New password must be different from your current password.' });

    user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await user.save();
    res.json({ msg: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ msg: 'Unable to change your password right now. Please try again.' });
  }
});

router.put('/deactivate', auth, async (req, res) => {
  req.user.isActive = false;
  await req.user.save();
  res.json({ msg: 'Account deactivated' });
});

router.delete('/account', auth, async (req, res) => {
  if (req.body.confirmation !== 'DELETE') return res.status(400).json({ msg: 'Type DELETE to confirm account removal' });
  await User.findByIdAndDelete(req.user.id);
  res.json({ msg: 'Account deleted' });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: 'Missing fields' });
    if (role && !['patient', 'doctor', 'admin'].includes(role)) return res.status(400).json({ msg: 'Invalid account type' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const roleValue = role || 'patient';
    const isDoctor = roleValue === 'doctor';
    user = new User({
      name,
      email,
      password: hash,
      role: roleValue,
      verified: isDoctor ? false : true,
      verificationStatus: isDoctor ? 'pending' : 'verified',
    });
    await user.save();

    if (isDoctor) {
      let doc = await Doctor.findOne({ user: user.id });
      if (!doc) {
        doc = new Doctor({
          user: user.id,
          specialization: 'General Medicine',
          experience: 0,
          fees: 500,
          verified: false,
          bio: `Dr. ${name.replace(/^(Dr\.\s*)+/i, '')} - Newly registered practitioner pending verification.`,
        });
        await doc.save();
      }
    }

    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
