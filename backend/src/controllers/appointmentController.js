const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const getSlotRange = (date) => {
  const slotStart = new Date(date);
  if (Number.isNaN(slotStart.getTime())) return null;
  slotStart.setSeconds(0, 0);
  return { slotStart, slotEnd: new Date(slotStart.getTime() + 60 * 1000) };
};

const getBookedSlots = async (doctor, date) => {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) return null;
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const appointments = await Appointment.find({
    doctor,
    date: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ['requested', 'confirmed', 'approved'] }
  }).select('date').lean();
  return appointments.map(appointment => {
    const slotDate = new Date(appointment.date);
    const hours = String(slotDate.getUTCHours()).padStart(2, '0');
    const minutes = String(slotDate.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const doctor = req.query.doctorId || req.query.doctor;
    const { date } = req.query;
    if (!doctor || !date) return res.status(400).json({ msg: 'Doctor and date are required' });
    const bookedSlots = await getBookedSlots(doctor, date);
    if (!bookedSlots) return res.status(400).json({ msg: 'Invalid date' });
    res.json({ slots: TIME_SLOTS.filter(slot => !bookedSlots.includes(slot)) });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.create = async (req, res) => {
  try {
    const { doctor, date, reason } = req.body;
    if (!doctor || !date) return res.status(400).json({ msg: 'Missing fields' });
    const slotRange = getSlotRange(date);
    if (!slotRange) return res.status(400).json({ msg: 'Invalid appointment date' });
    const existing = await Appointment.findOne({
      doctor,
      date: { $gte: slotRange.slotStart, $lt: slotRange.slotEnd },
      status: { $in: ['requested', 'confirmed', 'approved'] }
    }).select('_id');
    if (existing) {
      return res.status(409).json({ msg: 'This time slot is already booked. Please choose another time.' });
    }
    const appt = new Appointment({ patient: req.user.id, doctor, date: slotRange.slotStart, reason, status: 'requested' });
    await appt.save();
    res.json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.getMy = async (req, res) => {
  try {
    const ownDoctorProfiles = await Doctor.find({ user: req.user.id }).select('_id').lean();
    const doctorIds = ownDoctorProfiles.map(doctor => doctor._id);
    const appts = await Appointment.find({
      $or: [{ patient: req.user.id }, { doctor: req.user.id }, { doctor: { $in: doctorIds } }]
    }).populate('patient', 'name email');

    const appointmentDoctorIds = appts.map(appointment => appointment.doctor);
    const doctorProfiles = await Doctor.find({
      $or: [{ _id: { $in: appointmentDoctorIds } }, { user: { $in: appointmentDoctorIds } }]
    }).populate('user', 'name email').lean();

    const response = appts.map(appointment => {
      const doctorId = String(appointment.doctor);
      const doctor = doctorProfiles.find(profile => (
        String(profile._id) === doctorId || String(profile.user?._id) === doctorId
      ));
      return {
        ...appointment.toObject(),
        doctor: doctor || appointment.doctor,
        doctorId: doctor?._id || appointment.doctor
      };
    });
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.reschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });
    // only patient or doctor can reschedule
    if (String(appt.patient) !== String(req.user.id) && String(appt.doctor) !== String(req.user.id)) return res.status(403).json({ msg: 'Forbidden' });
    appt.date = date;
    appt.status = 'requested';
    await appt.save();
    res.json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });
    if (String(appt.patient) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ msg: 'Forbidden' });
    appt.status = 'cancelled';
    await appt.save();
    res.json({ msg: 'Appointment cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ msg: 'Appointment not found' });
    appt.paymentStatus = status;
    await appt.save();
    res.json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
