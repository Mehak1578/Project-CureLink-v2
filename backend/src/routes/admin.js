const express = require('express');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Report = require('../models/Report');

const router = express.Router();

router.use(auth);
router.use(roles('admin'));

const getDayBounds = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

router.get('/summary', async (req, res) => {
  try {
    const { start, end } = getDayBounds();

    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalReports,
      todayNewPatients,
      todayNewDoctors,
      todayAppointments,
      todayCancelled,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      Appointment.countDocuments(),
      Report.countDocuments(),
      User.countDocuments({ role: 'patient', createdAt: { $gte: start, $lt: end } }),
      User.countDocuments({ role: 'doctor', createdAt: { $gte: start, $lt: end } }),
      Appointment.countDocuments({ date: { $gte: start, $lt: end } }),
      Appointment.countDocuments({ status: 'cancelled', updatedAt: { $gte: start, $lt: end } }),
    ]);

    res.json({
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalReports,
      todayNewPatients,
      todayNewDoctors,
      todayAppointments,
      todayCancelled,
    });
  } catch (error) {
    console.error('Admin summary error:', error);
    res.status(500).json({ msg: 'Unable to load admin summary' });
  }
});

router.get('/patients', async (req, res) => {
  try {
    const users = await User.find({ role: 'patient' }).sort({ createdAt: -1 }).lean();

    const rows = await Promise.all(
      users.map(async (user) => {
        const appointmentsCount = await Appointment.countDocuments({ patient: user._id });
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          registrationDate: user.createdAt,
          appointmentsCount,
          status: user.isActive === false ? 'Inactive' : 'Active',
        };
      })
    );

    res.json(rows);
  } catch (error) {
    console.error('Admin patients error:', error);
    res.status(500).json({ msg: 'Unable to load patients' });
  }
});

router.get('/doctors', async (req, res) => {
  try {
    const users = await User.find({ role: 'doctor' }).sort({ createdAt: -1 }).lean();
    const profiles = await Doctor.find({ user: { $in: users.map((user) => user._id) } }).lean();
    const profileByUserId = new Map(profiles.map((profile) => [String(profile.user), profile]));

    const rows = users.map((user) => {
      const profile = profileByUserId.get(String(user._id));
      return {
        id: user._id,
        doctorId: profile?._id,
        name: user.name,
        email: user.email,
        phone: user.phone || 'Not set',
        specialization: profile?.specialization || 'Not set',
        qualification: profile?.qualification || 'Not set',
        registrationNumber: profile?.registrationNumber || 'Not set',
        clinic: profile?.clinic || 'Not set',
        bio: profile?.bio || '',
        experience: profile?.experience !== undefined && profile?.experience !== null ? `${profile.experience} yrs` : 'Not set',
        fees: profile?.fees !== undefined && profile?.fees !== null ? `₹${profile.fees}` : 'Not set',
        status: user.verified || user.verificationStatus === 'verified' ? 'verified' : (user.verificationStatus || 'pending'),
      };
    });

    res.json(rows);
  } catch (error) {
    console.error('Admin doctors error:', error);
    res.status(500).json({ msg: 'Unable to load doctors' });
  }
});

router.patch('/doctors/:id/verification', async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'verified', 'rejected', 'changes_requested'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid verification status' });
    }

    const user = await User.findOne({ _id: req.params.id, role: 'doctor' });
    if (!user) return res.status(404).json({ msg: 'Doctor not found' });

    user.verificationStatus = status;
    user.verified = status === 'verified';
    await user.save();

    await Doctor.updateMany({ user: user._id }, { verified: status === 'verified' });

    res.json({ msg: 'Verification status updated', status });
  } catch (error) {
    console.error('Admin doctor verification update error:', error);
    res.status(500).json({ msg: 'Unable to update verification status' });
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find({})
      .populate('patient', 'name email')
      .populate('doctor', 'name email')
      .sort({ date: -1 })
      .lean();

    const rows = appointments.map((appointment) => ({
      id: appointment._id,
      patientName: appointment.patient?.name || 'Unknown patient',
      doctorName: appointment.doctor?.name || 'Unknown doctor',
      dateTime: appointment.date,
      status: appointment.status || 'requested',
      reason: appointment.reason || 'General consultation',
      consultationMode: appointment.consultationMode || 'online',
    }));

    res.json(rows);
  } catch (error) {
    console.error('Admin appointments error:', error);
    res.status(500).json({ msg: 'Unable to load appointments' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({})
      .populate('patient', 'name email')
      .sort({ uploadedAt: -1 })
      .lean();

    const rows = reports.map((report) => ({
      id: report._id,
      patientName: report.patient?.name || 'Unknown patient',
      fileName: report.fileName || report.filename || 'Report file',
      uploadedAt: report.uploadedAt || report.createdAt,
      fileType: report.fileType || report.contentType || 'Unknown',
      url: report.url,
    }));

    res.json(rows);
  } catch (error) {
    console.error('Admin reports error:', error);
    res.status(500).json({ msg: 'Unable to load reports' });
  }
});

module.exports = router;