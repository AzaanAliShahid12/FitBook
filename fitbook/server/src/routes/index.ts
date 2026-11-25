import { NextFunction, Request, Response, Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadImage } from '../middleware/upload';
import {
  registerSchema, loginSchema, refreshSchema, forgotSchema, resetSchema, verifyEmailSchema,
  changePasswordSchema, updateProfileSchema, createClassSchema, updateClassSchema,
  createBookingSchema, cancelBookingSchema, createInstructorSchema, updateUserSchema,
  categorySchema, roomSchema, markAttendanceSchema,
} from '../validators/schemas';
import * as auth from '../controllers/authController';
import * as classes from '../controllers/classController';
import * as bookings from '../controllers/bookingController';
import * as users from '../controllers/userController';
import * as notifications from '../controllers/notificationController';
import * as admin from '../controllers/adminController';

type AsyncFn = (req: Request, res: Response) => Promise<unknown>;
const asyncHandler =
  (fn: AsyncFn) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

export function buildRoutes() {
  const router = Router();

  // ----- Auth -----
  const authR = Router();
  authR.post('/register', validate(registerSchema), asyncHandler(auth.register));
  authR.post('/login', validate(loginSchema), asyncHandler(auth.login));
  authR.post('/refresh', validate(refreshSchema), asyncHandler(auth.refresh));
  authR.post('/logout', asyncHandler(auth.logout));
  authR.post('/forgot-password', validate(forgotSchema), asyncHandler(auth.forgotPassword));
  authR.post('/reset-password', validate(resetSchema), asyncHandler(auth.resetPassword));
  authR.post('/verify-email', validate(verifyEmailSchema), asyncHandler(auth.verifyEmail));
  authR.get('/me', requireAuth, asyncHandler(auth.me));
  authR.put('/me', requireAuth, validate(updateProfileSchema), asyncHandler(auth.updateMe));
  authR.post('/me/change-password', requireAuth, validate(changePasswordSchema), asyncHandler(auth.changePassword));
  authR.post('/me/avatar', requireAuth, uploadImage.single('avatar'), asyncHandler(auth.uploadAvatar));
  router.use('/auth', authR);

  // ----- Classes -----
  const classR = Router();
  classR.get('/', optionalAuth, asyncHandler(classes.listPublic));
  classR.get('/:id', optionalAuth, asyncHandler(classes.getOne));
  classR.get('/:id/availability', asyncHandler(classes.availability));
  classR.post('/', requireAuth, requireRole(Role.ADMIN), validate(createClassSchema), asyncHandler(classes.create));
  classR.put('/:id', requireAuth, requireRole(Role.ADMIN), validate(updateClassSchema), asyncHandler(classes.update));
  classR.delete('/:id', requireAuth, requireRole(Role.ADMIN), asyncHandler(classes.remove));
  classR.post('/:id/cancel', requireAuth, requireRole(Role.ADMIN), asyncHandler(classes.cancel));
  classR.get('/:id/bookings', requireAuth, requireRole(Role.ADMIN, Role.INSTRUCTOR), asyncHandler(classes.classBookings));
  classR.get('/:id/waitlist', requireAuth, requireRole(Role.ADMIN, Role.INSTRUCTOR), asyncHandler(classes.classWaitlist));
  router.use('/classes', classR);

  // ----- Bookings -----
  const bookingR = Router();
  bookingR.post('/', requireAuth, validate(createBookingSchema), asyncHandler(bookings.create));
  bookingR.get('/my', requireAuth, asyncHandler(bookings.myBookings));
  bookingR.get('/:id', requireAuth, asyncHandler(bookings.getOne));
  bookingR.post('/:id/cancel', requireAuth, validate(cancelBookingSchema), asyncHandler(bookings.cancel));
  router.use('/bookings', bookingR);

  // ----- Waitlist -----
  const waitlistR = Router();
  waitlistR.post('/:classId/join', requireAuth, asyncHandler(bookings.joinWaitlist));
  waitlistR.delete('/:entryId/leave', requireAuth, asyncHandler(bookings.leaveWaitlist));
  waitlistR.get('/my', requireAuth, asyncHandler(bookings.myWaitlist));
  router.use('/waitlist', waitlistR);

  // ----- Members (admin) -----
  const memberR = Router();
  memberR.use(requireAuth, requireRole(Role.ADMIN));
  memberR.get('/', asyncHandler(users.listMembers));
  memberR.get('/:id', asyncHandler(users.getMember));
  memberR.put('/:id', validate(updateUserSchema), asyncHandler(users.updateUser));
  memberR.delete('/:id', asyncHandler(users.deleteUser));
  router.use('/members', memberR);

  // ----- Instructors -----
  const instructorR = Router();
  instructorR.get('/', asyncHandler(users.listInstructors));
  instructorR.post('/', requireAuth, requireRole(Role.ADMIN), validate(createInstructorSchema), asyncHandler(users.createInstructor));
  instructorR.put('/:id', requireAuth, requireRole(Role.ADMIN), validate(updateUserSchema), asyncHandler(users.updateUser));
  instructorR.get('/:id/classes', asyncHandler(users.instructorClasses));
  router.use('/instructors', instructorR);

  // ----- Instructor self-service -----
  const meInstructorR = Router();
  meInstructorR.use(requireAuth, requireRole(Role.INSTRUCTOR, Role.ADMIN));
  meInstructorR.get('/classes', asyncHandler(users.myClasses));
  meInstructorR.get('/stats', asyncHandler(users.myStats));
  meInstructorR.post('/attendance', validate(markAttendanceSchema), asyncHandler(users.markAttendance));
  router.use('/instructor', meInstructorR);

  // ----- Notifications -----
  const notifR = Router();
  notifR.use(requireAuth);
  notifR.get('/', asyncHandler(notifications.list));
  notifR.put('/read-all', asyncHandler(notifications.markAllRead));
  notifR.put('/:id/read', asyncHandler(notifications.markRead));
  notifR.delete('/:id', asyncHandler(notifications.remove));
  router.use('/notifications', notifR);

  // ----- Admin -----
  const adminR = Router();
  adminR.use(requireAuth, requireRole(Role.ADMIN));
  adminR.get('/analytics', asyncHandler(admin.analyticsOverview));
  adminR.get('/bookings', asyncHandler(bookings.adminList));
  adminR.get('/classes', asyncHandler(classes.listAll));
  adminR.get('/waitlist', asyncHandler(bookings.adminWaitlist));
  adminR.post('/waitlist/:entryId/promote', asyncHandler(bookings.adminPromote));
  adminR.post('/waitlist/:entryId/retry-promotion', asyncHandler(bookings.adminRetryPromotion));
  adminR.delete('/waitlist/:entryId', asyncHandler(bookings.adminRemoveEntry));
  adminR.get('/categories', asyncHandler(admin.listCategories));
  adminR.post('/categories', validate(categorySchema), asyncHandler(admin.createCategory));
  adminR.put('/categories/:id', validate(categorySchema), asyncHandler(admin.updateCategory));
  adminR.delete('/categories/:id', asyncHandler(admin.deleteCategory));
  adminR.get('/rooms', asyncHandler(admin.listRooms));
  adminR.post('/rooms', validate(roomSchema), asyncHandler(admin.createRoom));
  adminR.put('/rooms/:id', validate(roomSchema), asyncHandler(admin.updateRoom));
  adminR.delete('/rooms/:id', asyncHandler(admin.deleteRoom));
  adminR.get('/reports/bookings', asyncHandler(admin.bookingsReport));
  adminR.get('/reports/waitlists', asyncHandler(admin.waitlistReport));
  adminR.get('/reports/attendance', asyncHandler(admin.attendanceReport));
  adminR.get('/audit-logs', asyncHandler(admin.auditLogs));
  router.use('/admin', adminR);

  // Public categories & rooms (for explore filters / forms)
  router.get('/categories', asyncHandler(admin.listCategories));
  router.get('/rooms', asyncHandler(admin.listRooms));

  return router;
}
