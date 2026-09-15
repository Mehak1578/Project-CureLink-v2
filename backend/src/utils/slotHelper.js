const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

const DEFAULT_WORKING_HOURS = {
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  start: '09:00',
  end: '17:00',
  breakStart: '',
  breakEnd: '',
  duration: 30
};

const getDayName = (dateInput) => {
  let d;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) {
      d = new Date(dateInput);
    } else {
      const parts = dateInput.split('-');
      // YYYY-MM-DD parsed as local date
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  } else {
    d = new Date(dateInput);
  }
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return daysOfWeek[d.getDay()];
};

const generateSlotsForDoctorAndDate = (doctor, dateStr) => {
  const hours = doctor.workingHours || {};
  const days = (hours.days && hours.days.length > 0) ? hours.days : DEFAULT_WORKING_HOURS.days;
  const start = hours.start || DEFAULT_WORKING_HOURS.start;
  const end = hours.end || DEFAULT_WORKING_HOURS.end;
  const duration = hours.duration || DEFAULT_WORKING_HOURS.duration;

  const dayName = getDayName(dateStr);
  if (!days.includes(dayName)) {
    return [];
  }

  const startParts = start.split(':');
  const endParts = end.split(':');
  if (startParts.length !== 2 || endParts.length !== 2) {
    return [];
  }

  const startMinutes = Number(startParts[0]) * 60 + Number(startParts[1]);
  const endMinutes = Number(endParts[0]) * 60 + Number(endParts[1]);
  const slotDuration = Number(duration) || 30;

  const slots = [];
  let current = startMinutes;
  while (current + slotDuration <= endMinutes) {
    const hour = Math.floor(current / 60);
    const min = current % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    slots.push(timeStr);
    current += slotDuration;
  }
  return slots;
};

const getAvailableSlotsForDoctorAndDate = async (doctorProfile, dateStr) => {
  const allSlots = generateSlotsForDoctorAndDate(doctorProfile, dateStr);
  if (allSlots.length === 0) return [];

  const doctorIds = [doctorProfile._id];
  if (doctorProfile.user) {
    doctorIds.push(doctorProfile.user._id || doctorProfile.user);
  }

  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  
  const dayStart = new Date(year, month, day, 0, 0, 0);
  const dayEnd = new Date(year, month, day + 1, 0, 0, 0);

  const appointments = await Appointment.find({
    doctor: { $in: doctorIds },
    date: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ['requested', 'confirmed', 'approved', 'waiting', 'in_consultation'] }
  }).lean();

  const bookedSlots = appointments.map(appt => {
    const d = new Date(appt.date);
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  });

  return allSlots.filter(slot => !bookedSlots.includes(slot));
};

const populateDoctorAvailableSlots = async (doctorProfile) => {
  const doctorIds = [doctorProfile._id];
  if (doctorProfile.user) {
    doctorIds.push(doctorProfile.user._id || doctorProfile.user);
  }

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000);

  const appointments = await Appointment.find({
    doctor: { $in: doctorIds },
    date: { $gte: startDate, $lt: endDate },
    status: { $in: ['requested', 'confirmed', 'approved', 'waiting', 'in_consultation'] }
  }).lean();

  const availableSlots = [];
  
  for (let i = 0; i < 14; i++) {
    const futureDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
    const y = futureDate.getFullYear();
    const m = String(futureDate.getMonth() + 1).padStart(2, '0');
    const d = String(futureDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const allSlots = generateSlotsForDoctorAndDate(doctorProfile, dateStr);
    if (allSlots.length > 0) {
      const bookedSlots = appointments.filter(appt => {
        const ad = new Date(appt.date);
        const ay = ad.getFullYear();
        const am = String(ad.getMonth() + 1).padStart(2, '0');
        const aday = String(ad.getDate()).padStart(2, '0');
        return `${ay}-${am}-${aday}` === dateStr;
      }).map(appt => {
        const ad = new Date(appt.date);
        const ah = String(ad.getHours()).padStart(2, '0');
        const amin = String(ad.getMinutes()).padStart(2, '0');
        return `${ah}:${amin}`;
      });

      const freeSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
      for (const slot of freeSlots) {
        const localString = `${dateStr}T${slot}:00`;
        availableSlots.push({ date: new Date(localString) });
      }
    }
  }
  
  doctorProfile.availableSlots = availableSlots;
  return doctorProfile;
};

module.exports = {
  DEFAULT_WORKING_HOURS,
  getDayName,
  generateSlotsForDoctorAndDate,
  getAvailableSlotsForDoctorAndDate,
  populateDoctorAvailableSlots
};
