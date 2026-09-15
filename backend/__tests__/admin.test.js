const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const User = require('../src/models/User');
const Doctor = require('../src/models/Doctor');
const Appointment = require('../src/models/Appointment');
const adminRoutes = require('../src/routes/admin');

let mongod;
let app;
let adminToken = 'mock-admin-token';
let adminUser;

const mockAdminId = '60c72b2f9b1d8e25d482599c';

// Mock auth middleware for testing admin routes
jest.mock('../src/middleware/auth', () => (req, res, next) => {
  req.user = { id: '60c72b2f9b1d8e25d482599c', role: 'admin' };
  next();
});

beforeAll(async () => {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  // Create admin user for mocks
  adminUser = new User({ _id: mockAdminId, name: 'Admin User', email: 'admin@example.com', password: 'password123', role: 'admin' });
  await adminUser.save();

  app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('GET /api/admin/doctors returns correct verification status mapping', async () => {
  // 1. Pending doctor user
  const uPending = new User({ name: 'Dr. Pending', email: 'pending@example.com', password: 'password123', role: 'doctor', verified: false, verificationStatus: 'pending' });
  await uPending.save();

  // 2. Verified doctor user (sample / seeded)
  const uVerified = new User({ name: 'Dr. Verified', email: 'verified@example.com', password: 'password123', role: 'doctor', verified: true, verificationStatus: 'pending' });
  await uVerified.save();

  // 3. Rejected doctor user
  const uRejected = new User({ name: 'Dr. Rejected', email: 'rejected@example.com', password: 'password123', role: 'doctor', verified: false, verificationStatus: 'rejected' });
  await uRejected.save();

  const response = await request(app).get('/api/admin/doctors');
  expect(response.status).toBe(200);

  const pendingRow = response.body.find(d => String(d.id) === String(uPending._id));
  expect(pendingRow.status).toBe('pending');

  const verifiedRow = response.body.find(d => String(d.id) === String(uVerified._id));
  expect(verifiedRow.status).toBe('verified');

  const rejectedRow = response.body.find(d => String(d.id) === String(uRejected._id));
  expect(rejectedRow.status).toBe('rejected');
});

test('PATCH /api/admin/doctors/:id/verification updates doctor verification correctly', async () => {
  const uPending = new User({ name: 'Dr. ToApprove', email: 'toapprove@example.com', password: 'password123', role: 'doctor', verified: false, verificationStatus: 'pending' });
  await uPending.save();

  const doctorProfile = new Doctor({ user: uPending._id, specialization: 'General', experience: 5, fees: 500 });
  await doctorProfile.save();

  // Update status to verified
  const patchRes = await request(app)
    .patch(`/api/admin/doctors/${uPending._id}/verification`)
    .send({ status: 'verified' });

  expect(patchRes.status).toBe(200);
  expect(patchRes.body.status).toBe('verified');

  // Verify DB state
  const updatedUser = await User.findById(uPending._id);
  expect(updatedUser.verified).toBe(true);
  expect(updatedUser.verificationStatus).toBe('verified');

  const updatedProfile = await Doctor.findOne({ user: uPending._id });
  expect(updatedProfile.verified).toBe(true);
});

test('GET /api/admin/appointments returns appointments with reason and consultationMode', async () => {
  const p = new User({ name: 'Patient X', email: 'patientx@example.com', password: 'password123', role: 'patient' });
  await p.save();

  const d = new User({ name: 'Dr. Y', email: 'dry@example.com', password: 'password123', role: 'doctor' });
  await d.save();

  const appt = new Appointment({
    patient: p._id,
    doctor: d._id,
    date: new Date(),
    reason: 'Frequent headaches',
    consultationMode: 'online',
    status: 'confirmed'
  });
  await appt.save();

  const response = await request(app).get('/api/admin/appointments');
  expect(response.status).toBe(200);

  const row = response.body.find(a => String(a.id) === String(appt._id));
  expect(row).toBeDefined();
  expect(row.patientName).toBe('Patient X');
  expect(row.doctorName).toBe('Dr. Y');
  expect(row.reason).toBe('Frequent headaches');
  expect(row.consultationMode).toBe('online');
});
