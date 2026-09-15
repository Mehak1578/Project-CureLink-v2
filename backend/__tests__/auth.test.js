const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
let mongod;

beforeAll(async () => {
  // If MONGO_URI is provided in env, use it (user requested real MongoDB). Otherwise fall back to in-memory.
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Tests: connected to configured MongoDB');
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Tests: connected to in-memory MongoDB');
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('register and login flow', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/auth'));

  const user = { name: 'Test', email: 'test@example.com', password: 'password123' };
  const res1 = await request(app).post('/api/auth/register').send(user);
  expect(res1.statusCode).toBe(200);
  expect(res1.body).toHaveProperty('token');

  const res2 = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
  expect(res2.statusCode).toBe(200);
  expect(res2.body).toHaveProperty('token');
});

test('persists doctor role through registration and login', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/auth'));

  const user = { name: 'Doctor Test', email: 'doctor-role@example.com', password: 'password123', role: 'doctor' };
  const registered = await request(app).post('/api/auth/register').send(user);
  expect(registered.statusCode).toBe(200);
  expect(registered.body.user.role).toBe('doctor');

  const loggedIn = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
  expect(loggedIn.statusCode).toBe(200);
  expect(loggedIn.body.user.role).toBe('doctor');
});

test('persists admin role through registration and login', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/auth'));

  const user = { name: 'Admin Test', email: 'admin-role@example.com', password: 'password123', role: 'admin' };
  const registered = await request(app).post('/api/auth/register').send(user);
  expect(registered.statusCode).toBe(200);
  expect(registered.body.user.role).toBe('admin');

  const loggedIn = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
  expect(loggedIn.statusCode).toBe(200);
  expect(loggedIn.body.user.role).toBe('admin');
});

test('changes password only after verifying the current password', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/auth'));

  const user = { name: 'Password Test', email: 'password-test@example.com', password: 'OldPassword123!' };
  const registered = await request(app).post('/api/auth/register').send(user);
  const token = registered.body.token;

  const wrong = await request(app)
    .put('/api/auth/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: 'wrong-password', newPassword: 'NewPassword123!' });
  expect(wrong.statusCode).toBe(400);
  expect(wrong.body.msg).toBe('Current password is incorrect.');

  const changed = await request(app)
    .put('/api/auth/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: user.password, newPassword: 'NewPassword123!' });
  expect(changed.statusCode).toBe(200);

  const oldLogin = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
  expect(oldLogin.statusCode).toBe(400);
  const newLogin = await request(app).post('/api/auth/login').send({ email: user.email, password: 'NewPassword123!' });
  expect(newLogin.statusCode).toBe(200);
});

test('accepts a short existing login password as the current password', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/auth'));

  const user = { name: 'Legacy Password Test', email: 'legacy-password@example.com', password: 'abc123' };
  const registered = await request(app).post('/api/auth/register').send(user);
  const changed = await request(app)
    .put('/api/auth/change-password')
    .set('Authorization', `Bearer ${registered.body.token}`)
    .send({ currentPassword: user.password, newPassword: 'NewPassword123!' });

  expect(changed.statusCode).toBe(200);
});
