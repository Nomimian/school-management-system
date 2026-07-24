// Automated tenant-isolation, RBAC, plan-limit and auth tests.
// Runs against a DEDICATED test database (never the real one) using supertest
// against the in-process Express app (no port is bound).
//
//   npm test
//
// Requires a local MongoDB on 27017 (same instance the app uses).

process.env.MONGO_URI  = 'mongodb://localhost:27017/school_mgmt_isotest';
process.env.NODE_ENV   = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '1h';

const test     = require('node:test');
const assert   = require('node:assert');
const mongoose = require('mongoose');
const request  = require('supertest');
const app      = require('../server');
const School   = require('../models/School');
const User     = require('../models/User');
const Student  = require('../models/Student');

const login = async (email, password) =>
  (await request(app).post('/api/auth/login').send({ email, password })).body.token;

let A = {}, B = {};

test.before(async () => {
  if (mongoose.connection.readyState !== 1) {
    await new Promise((res) => mongoose.connection.once('connected', res));
  }
  // Safety: refuse to run against anything but the isolation test DB.
  assert.match(mongoose.connection.name, /isotest/, 'refusing to run on a non-test database');
  await Promise.all([School.deleteMany({}), User.deleteMany({}), Student.deleteMany({})]);

  const sa = await School.create({ name: 'Alpha School', maxStudents: 2, maxTeachers: 5, plan: 'trial', isActive: true });
  await User.create({ name: 'Alpha Admin', email: 'a-admin@test.com', password: 'pass123', role: 'admin', school: sa._id });
  const stuA = await Student.create({ name: 'Alpha Kid', class: '1', gender: 'Male', school: sa._id });

  const sb = await School.create({ name: 'Beta School', maxStudents: 50, maxTeachers: 5, plan: 'basic', isActive: true });
  await User.create({ name: 'Beta Admin', email: 'b-admin@test.com', password: 'pass123', role: 'admin', school: sb._id });
  await User.create({ name: 'Beta Teacher', email: 'b-teacher@test.com', password: 'pass123', role: 'teacher', school: sb._id });
  const stuB = await Student.create({ name: 'Beta Kid', class: '1', gender: 'Female', school: sb._id });

  A = { school: sa, studentId: stuA._id, token: await login('a-admin@test.com', 'pass123') };
  B = {
    school: sb, studentId: stuB._id,
    token: await login('b-admin@test.com', 'pass123'),
    teacherToken: await login('b-teacher@test.com', 'pass123'),
  };
});

test.after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('auth: protected route without a token → 401', async () => {
  const res = await request(app).get('/api/students');
  assert.strictEqual(res.status, 401);
});

test('auth: invalid email on login → 400 (validation)', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'x' });
  assert.strictEqual(res.status, 400);
});

test('tenant isolation: School A cannot read School B\'s student by id → 404', async () => {
  const res = await request(app).get(`/api/students/${B.studentId}`).set('Authorization', `Bearer ${A.token}`);
  assert.strictEqual(res.status, 404);
});

test('tenant isolation: A\'s student list contains only A\'s students', async () => {
  const res = await request(app).get('/api/students').set('Authorization', `Bearer ${A.token}`);
  assert.strictEqual(res.status, 200);
  const names = res.body.data.map((s) => s.name);
  assert.ok(names.includes('Alpha Kid'), 'should see own student');
  assert.ok(!names.includes('Beta Kid'), 'must NOT see other tenant student');
});

test('tenant isolation: A cannot update B\'s student → 404', async () => {
  const res = await request(app).put(`/api/students/${B.studentId}`).set('Authorization', `Bearer ${A.token}`).send({ name: 'HACKED' });
  assert.strictEqual(res.status, 404);
});

test('RBAC: teacher cannot create students (write blocked) → 403', async () => {
  const res = await request(app).post('/api/students').set('Authorization', `Bearer ${B.teacherToken}`).send({ name: 'X', class: '1', gender: 'Male' });
  assert.strictEqual(res.status, 403);
});

test('RBAC: teacher cannot access fees module → 403', async () => {
  const res = await request(app).get('/api/fees').set('Authorization', `Bearer ${B.teacherToken}`);
  assert.strictEqual(res.status, 403);
});

test('RBAC: teacher CAN read students (allowed) → 200', async () => {
  const res = await request(app).get('/api/students').set('Authorization', `Bearer ${B.teacherToken}`);
  assert.strictEqual(res.status, 200);
});

test('plan limit: Alpha (maxStudents=2, has 1) allows one more then blocks with 403', async () => {
  const ok = await request(app).post('/api/students').set('Authorization', `Bearer ${A.token}`).send({ name: 'Kid Two', class: '1', gender: 'Male' });
  assert.strictEqual(ok.status, 201);
  const blocked = await request(app).post('/api/students').set('Authorization', `Bearer ${A.token}`).send({ name: 'Kid Three', class: '1', gender: 'Male' });
  assert.strictEqual(blocked.status, 403);
  assert.match(blocked.body.message, /limit/i);
});
