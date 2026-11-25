import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/db';

const app = createApp();
const api = () => request(app);

let categoryId: string;
let instructorToken: string;
let adminToken: string;
let classId: string;
let smallClassId: string;

async function registerUser(email: string, name = 'Test User') {
  const res = await api().post('/api/auth/register').send({
    name, email, password: 'Test@1234', confirmPassword: 'Test@1234',
  });
  expect(res.status).toBe(201);
  return res.body.data as { accessToken: string; user: { id: string } };
}

beforeAll(async () => {
  await prisma.attendance.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.fitnessClass.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: 'test.dev' } } });
  await prisma.category.deleteMany({ where: { name: 'TestCat' } });

  const cat = await prisma.category.create({ data: { name: 'TestCat' } });
  categoryId = cat.id;

  const admin = await api().post('/api/auth/register').send({
    name: 'Admin T', email: 'admin@test.dev', password: 'Test@1234', confirmPassword: 'Test@1234',
  });
  await prisma.user.update({ where: { email: 'admin@test.dev' }, data: { role: 'ADMIN' } });
  const adminLogin = await api().post('/api/auth/login').send({ email: 'admin@test.dev', password: 'Test@1234' });
  adminToken = adminLogin.body.data.accessToken;

  const instructor = await api().post('/api/instructors').set('Authorization', `Bearer ${adminToken}`).send({
    name: 'Coach T', email: 'coach@test.dev', password: 'Test@1234', specialties: ['Yoga'], experienceYears: 5,
  });
  expect(instructor.status).toBe(201);
  const coachLogin = await api().post('/api/auth/login').send({ email: 'coach@test.dev', password: 'Test@1234' });
  instructorToken = coachLogin.body.data.accessToken;
  const coachId = instructor.body.data.id;

  const tomorrow = new Date(Date.now() + 86400000);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  const mkClass = async (title: string, capacity: number, hour: number) => {
    const start = new Date(tomorrow); start.setUTCHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + 3600000);
    const res = await api().post('/api/classes').set('Authorization', `Bearer ${adminToken}`).send({
      title, categoryId, instructorId: coachId, date: dateStr,
      startTime: start.toISOString(), endTime: end.toISOString(), capacity, price: 0,
    });
    expect(res.status).toBe(201);
    return res.body.data[0].id as string;
  };
  classId = await mkClass('Big Test Class', 2, 10);
  smallClassId = await mkClass('Tiny Test Class', 1, 12);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('authentication', () => {
  it('rejects unauthenticated access to protected routes', async () => {
    const res = await api().get('/api/bookings/my');
    expect(res.status).toBe(401);
  });

  it('rejects login with a wrong password', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'admin@test.dev', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('refresh token rotation works', async () => {
    const login = await api().post('/api/auth/login').send({ email: 'admin@test.dev', password: 'Test@1234' });
    const refreshToken = login.body.data.refreshToken;
    const refreshed = await api().post('/api/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);
    const reuse = await api().post('/api/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
  });
});

describe('role-based access', () => {
  it('members cannot create classes', async () => {
    const member = await registerUser('rbac@test.dev');
    const res = await api().post('/api/classes').set('Authorization', `Bearer ${member.accessToken}`).send({
      title: 'Nope', categoryId, instructorId: 'x', date: '2030-01-01',
      startTime: '2030-01-01T10:00:00Z', endTime: '2030-01-01T11:00:00Z', capacity: 5,
    });
    expect(res.status).toBe(403);
  });
});

describe('booking and waitlist workflow', () => {
  it('books a seat when available, rejects duplicates', async () => {
    const m = await registerUser('booker@test.dev');
    const first = await api().post('/api/bookings').set('Authorization', `Bearer ${m.accessToken}`).send({ classId });
    expect(first.status).toBe(201);
    const dup = await api().post('/api/bookings').set('Authorization', `Bearer ${m.accessToken}`).send({ classId });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('ALREADY_BOOKED');
  });

  it('fills the class, then waitlist + promotion on cancellation', async () => {
    const m2 = await registerUser('second@test.dev');
    const m3 = await registerUser('third@test.dev');
    const fill = await api().post('/api/bookings').set('Authorization', `Bearer ${m2.accessToken}`).send({ classId });
    expect(fill.status).toBe(201); // class capacity 2 now full

    const full = await api().post('/api/bookings').set('Authorization', `Bearer ${m3.accessToken}`).send({ classId });
    expect(full.status).toBe(409);
    expect(full.body.code).toBe('CLASS_FULL');

    const join = await api().post(`/api/waitlist/${classId}/join`).set('Authorization', `Bearer ${m3.accessToken}`);
    expect(join.status).toBe(201);
    expect(join.body.data.entry.position).toBe(1);

    const dupJoin = await api().post(`/api/waitlist/${classId}/join`).set('Authorization', `Bearer ${m3.accessToken}`);
    expect(dupJoin.status).toBe(409);

    // First booker cancels -> m3 must be promoted automatically
    const mine = await api().get('/api/bookings/my').set('Authorization', `Bearer ${(await api().post('/api/auth/login').send({ email: 'booker@test.dev', password: 'Test@1234' })).body.data.accessToken}`);
    const bookingId = mine.body.data[0].id;
    const cancel = await api().post(`/api/bookings/${bookingId}/cancel`).set('Authorization', `Bearer ${(await api().post('/api/auth/login').send({ email: 'booker@test.dev', password: 'Test@1234' })).body.data.accessToken}`).send({});
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.promotedBooking).toBeTruthy();
    expect(cancel.body.data.promotedBooking.userId).toBe(m3.user.id);

    const avail = await api().get(`/api/classes/${classId}/availability`);
    expect(avail.body.data.confirmedCount).toBe(2);
    expect(avail.body.data.availableSeats).toBe(0);

    const m3Bookings = await api().get('/api/bookings/my').set('Authorization', `Bearer ${m3.accessToken}`);
    expect(m3Bookings.body.data.some((b: { classId: string; status: string }) => b.classId === classId && b.status === 'CONFIRMED')).toBe(true);
  });

  it('prevents capacity overflow under concurrent booking attempts', async () => {
    const racers = await Promise.all(
      ['r1@test.dev', 'r2@test.dev', 'r3@test.dev', 'r4@test.dev', 'r5@test.dev'].map((e) => registerUser(e))
    );
    const results = await Promise.all(
      racers.map((r) => api().post('/api/bookings').set('Authorization', `Bearer ${r.accessToken}`).send({ classId: smallClassId }))
    );
    expect(results.filter((r) => r.status === 201).length).toBe(1);
    const avail = await api().get(`/api/classes/${smallClassId}/availability`);
    expect(avail.body.data.confirmedCount).toBe(1);
  });

  it('instructor token exists for instructor endpoints', async () => {
    const res = await api().get('/api/instructor/stats').set('Authorization', `Bearer ${instructorToken}`);
    expect(res.status).toBe(200);
  });
});
