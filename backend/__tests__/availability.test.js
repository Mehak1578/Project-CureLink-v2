const mongoose = require('mongoose');
const Doctor = require('../src/models/Doctor');
const Appointment = require('../src/models/Appointment');
const User = require('../src/models/User');
const { getAvailableSlotsForDoctorAndDate, generateSlotsForDoctorAndDate } = require('../src/utils/slotHelper');

let mongod;

beforeAll(async () => {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('generate slots based on custom working hours', () => {
  const doctor = {
    workingHours: {
      days: ['Monday', 'Wednesday'],
      start: '10:00',
      end: '12:00',
      duration: 30
    }
  };

  // Monday
  const slotsMon = generateSlotsForDoctorAndDate(doctor, '2026-08-24');
  expect(slotsMon).toEqual(['10:00', '10:30', '11:00', '11:30']);

  // Tuesday (Not a working day)
  const slotsTue = generateSlotsForDoctorAndDate(doctor, '2026-08-25');
  expect(slotsTue).toEqual([]);
});

test('filters out already booked slots', async () => {
  const user = new User({ name: 'Doctor One', email: 'doc1@example.com', password: 'password123', role: 'doctor', verified: true });
  await user.save();

  const doctor = new Doctor({
    user: user._id,
    specialization: 'Cardiology',
    experience: 5,
    fees: 1000,
    workingHours: {
      days: ['Monday', 'Tuesday'],
      start: '09:00',
      end: '11:00',
      duration: 30
    }
  });
  await doctor.save();

  const patient = new User({ name: 'Patient One', email: 'pat1@example.com', password: 'password123', role: 'patient' });
  await patient.save();

  // Book a slot: 09:30 on Monday 2026-08-24
  const apptDate = new Date('2026-08-24T09:30:00');
  const appointment = new Appointment({
    patient: patient._id,
    doctor: doctor._id,
    date: apptDate,
    reason: 'Routine checkup',
    status: 'confirmed'
  });
  await appointment.save();

  // Get available slots for Monday 2026-08-24
  const slots = await getAvailableSlotsForDoctorAndDate(doctor, '2026-08-24');
  // 09:30 should be excluded!
  expect(slots).toEqual(['09:00', '10:00', '10:30']);
});
