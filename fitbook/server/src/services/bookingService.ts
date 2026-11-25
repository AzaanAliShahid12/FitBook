import { Booking, FitnessClass, Prisma, WaitlistEntry } from '@prisma/client';
import { prisma } from '../config/db';
import { audit } from '../utils/audit';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';
import { bookingReference } from '../utils/tokens';
import { emitAvailability, emitClassEvent, emitToUser } from '../socket';
import { classWhen, notify } from './notificationService';
import { emailTemplates } from '../utils/email';

type Tx = Prisma.TransactionClient;

/** Serialize all booking/waitlist operations for one class (prevents race conditions). */
async function lockClassRow(tx: Tx, classId: string) {
  await tx.$queryRaw`SELECT id FROM "FitnessClass" WHERE id = ${classId} FOR UPDATE`;
}

async function confirmedCount(tx: Tx, classId: string) {
  return tx.booking.count({ where: { classId, status: 'CONFIRMED' } });
}

async function waitingEntries(tx: Tx, classId: string) {
  return tx.waitlistEntry.findMany({
    where: { classId, status: 'WAITING' },
    orderBy: [{ joinedAt: 'asc' }, { position: 'asc' }],
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

/** Reassign sequential positions 1..n to WAITING entries. Returns the renumbered entries. */
async function renumberWaitlist(tx: Tx, classId: string) {
  const entries = await waitingEntries(tx, classId);
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].position !== i + 1) {
      await tx.waitlistEntry.update({ where: { id: entries[i].id }, data: { position: i + 1 } });
      entries[i].position = i + 1;
    }
  }
  return entries;
}

export async function getAvailability(classId: string) {
  const cls = await prisma.fitnessClass.findUnique({ where: { id: classId } });
  if (!cls) throw notFound('Class not found');
  const [confirmed, waiting] = await Promise.all([
    prisma.booking.count({ where: { classId, status: 'CONFIRMED' } }),
    prisma.waitlistEntry.count({ where: { classId, status: 'WAITING' } }),
  ]);
  return {
    classId,
    capacity: cls.capacity,
    confirmedCount: confirmed,
    availableSeats: Math.max(0, cls.capacity - confirmed),
    waitlistCount: waiting,
    isFull: confirmed >= cls.capacity,
  };
}

async function emitAvailabilityNow(classId: string) {
  const a = await getAvailability(classId);
  emitAvailability(a);
  return a;
}

function assertBookable(cls: FitnessClass) {
  const now = new Date();
  if (cls.status === 'CANCELLED') throw badRequest('This class has been cancelled', 'CLASS_CANCELLED');
  if (cls.status !== 'PUBLISHED') throw badRequest('This class is not open for booking', 'CLASS_NOT_PUBLISHED');
  if (cls.bookingOpenAt && now < cls.bookingOpenAt) throw badRequest('Booking for this class has not opened yet', 'BOOKING_NOT_OPEN');
  if (cls.bookingCloseAt && now > cls.bookingCloseAt) throw badRequest('Booking for this class has closed', 'BOOKING_CLOSED');
  if (cls.startTime <= now) throw badRequest('This class has already started', 'CLASS_STARTED');
}

/**
 * Book a seat. Runs inside a transaction that locks the class row, so two
 * members racing for the last seat can never both succeed.
 */
export async function bookClass(userId: string, classId: string) {
  const result = await prisma.$transaction(async (tx) => {
    await lockClassRow(tx, classId);
    const cls = await tx.fitnessClass.findUnique({ where: { id: classId } });
    if (!cls) throw notFound('Class not found');
    assertBookable(cls);

    const existingBooking = await tx.booking.findFirst({
      where: { userId, classId, status: 'CONFIRMED' },
    });
    if (existingBooking) throw conflict('You have already booked this class', 'ALREADY_BOOKED');

    const existingWaitlist = await tx.waitlistEntry.findFirst({
      where: { userId, classId, status: 'WAITING' },
    });
    if (existingWaitlist) {
      throw conflict('You are already on the waitlist for this class', 'ALREADY_WAITLISTED');
    }

    const count = await confirmedCount(tx, classId);
    if (count >= cls.capacity) {
      throw conflict('This class is full. Join the waitlist to be notified when a seat opens.', 'CLASS_FULL');
    }

    const booking = await tx.booking.create({
      data: { userId, classId, bookingReference: bookingReference(), status: 'CONFIRMED' },
    });
    return { booking, cls };
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await notify({
    userId,
    title: 'Booking confirmed',
    message: `Your spot in ${result.cls.title} (${classWhen(result.cls)}) is confirmed. Ref: ${result.booking.bookingReference}`,
    type: 'BOOKING_CONFIRMED',
    metadata: { classId, bookingId: result.booking.id },
    emailSubject: 'FitBook — Booking confirmed',
    emailHtml: user ? emailTemplates.bookingConfirmed(user.name, result.cls.title, classWhen(result.cls), result.booking.bookingReference) : undefined,
  });
  emitClassEvent(classId, 'class:bookingConfirmed', { classId, bookingId: result.booking.id });
  const availability = await emitAvailabilityNow(classId);
  await audit(userId, 'BOOKING_CREATED', 'Booking', result.booking.id, { classId });
  return { booking: result.booking, availability };
}

/**
 * Promote the earliest eligible waitlisted member into a freed seat.
 * Must be called inside a transaction that already holds the class row lock.
 * Idempotent: a PROMOTED entry can never be promoted twice.
 */
async function promoteNext(tx: Tx, cls: FitnessClass) {
  const [next] = await waitingEntries(tx, cls.id);
  if (!next) return null;
  const booking = await tx.booking.create({
    data: { userId: next.userId, classId: cls.id, bookingReference: bookingReference(), status: 'CONFIRMED' },
  });
  const entry = await tx.waitlistEntry.update({
    where: { id: next.id },
    data: { status: 'PROMOTED', promotedAt: new Date() },
  });
  const remaining = await renumberWaitlist(tx, cls.id);
  return { entry, booking, promotedUser: next.user, remaining };
}

async function afterPromotion(
  cls: FitnessClass,
  promoted: { entry: WaitlistEntry; booking: Booking; promotedUser: { id: string; name: string; email: string }; remaining: Awaited<ReturnType<typeof waitingEntries>> }
) {
  await notify({
    userId: promoted.promotedUser.id,
    title: 'You got the spot!',
    message: `A seat opened in ${cls.title} (${classWhen(cls)}) and it is now yours. Ref: ${promoted.booking.bookingReference}`,
    type: 'WAITLIST_PROMOTED',
    metadata: { classId: cls.id, bookingId: promoted.booking.id },
    emailSubject: 'FitBook — You got the spot!',
    emailHtml: emailTemplates.waitlistPromoted(promoted.promotedUser.name, cls.title, classWhen(cls), promoted.booking.bookingReference),
  });
  emitToUser(promoted.promotedUser.id, 'waitlist:promoted', {
    classId: cls.id,
    bookingId: promoted.booking.id,
    bookingReference: promoted.booking.bookingReference,
  });
  for (const e of promoted.remaining) {
    emitToUser(e.userId, 'waitlist:positionUpdated', { classId: cls.id, entryId: e.id, position: e.position });
  }
}

/**
 * Cancel a confirmed booking. Automatically promotes the next waitlisted
 * member in the same transaction, so the seat is never double-filled.
 */
export async function cancelBooking(userId: string, bookingId: string, reason: string | undefined, isAdmin: boolean) {
  const existing = await prisma.booking.findUnique({ where: { id: bookingId }, include: { fitnessClass: true } });
  if (!existing) throw notFound('Booking not found');
  if (!isAdmin && existing.userId !== userId) throw forbidden('You can only cancel your own bookings');
  if (existing.status === 'CANCELLED') throw conflict('This booking is already cancelled', 'ALREADY_CANCELLED');

  const outcome = await prisma.$transaction(async (tx) => {
    await lockClassRow(tx, existing.classId);
    const cls = await tx.fitnessClass.findUnique({ where: { id: existing.classId } });
    if (!cls) throw notFound('Class not found');
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status === 'CANCELLED') throw conflict('This booking is already cancelled', 'ALREADY_CANCELLED');

    if (!isAdmin) {
      const deadline = new Date(cls.startTime.getTime() - cls.cancellationDeadlineHours * 3600 * 1000);
      if (new Date() > deadline) {
        throw badRequest(
          `Cancellation is allowed up to ${cls.cancellationDeadlineHours} hours before the class starts`,
          'CANCELLATION_WINDOW_CLOSED'
        );
      }
    }

    const cancelled = await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });

    let promoted: Awaited<ReturnType<typeof promoteNext>> = null;
    if (cls.autoPromote && cls.waitlistEnabled && cls.startTime > new Date() && cls.status === 'PUBLISHED') {
      promoted = await promoteNext(tx, cls);
    } else {
      await renumberWaitlist(tx, cls.id);
    }
    return { cancelled, cls, promoted };
  });

  const canceller = await prisma.user.findUnique({ where: { id: existing.userId } });
  await notify({
    userId: existing.userId,
    title: 'Booking cancelled',
    message: `Your booking for ${outcome.cls.title} (${classWhen(outcome.cls)}) has been cancelled.`,
    type: 'BOOKING_CANCELLED',
    metadata: { classId: existing.classId, bookingId },
    emailSubject: 'FitBook — Booking cancelled',
    emailHtml: canceller ? emailTemplates.bookingCancelled(canceller.name, outcome.cls.title, classWhen(outcome.cls)) : undefined,
  });
  if (outcome.promoted) await afterPromotion(outcome.cls, outcome.promoted);
  emitClassEvent(existing.classId, 'class:bookingCancelled', { classId: existing.classId, bookingId });
  const availability = await emitAvailabilityNow(existing.classId);
  await audit(userId, 'BOOKING_CANCELLED', 'Booking', bookingId, { classId: existing.classId, promotedUserId: outcome.promoted?.promotedUser.id });
  return { booking: outcome.cancelled, promotedBooking: outcome.promoted?.booking ?? null, availability };
}

/** Join the waitlist of a full class. Position = next sequential number. */
export async function joinWaitlist(userId: string, classId: string) {
  const result = await prisma.$transaction(async (tx) => {
    await lockClassRow(tx, classId);
    const cls = await tx.fitnessClass.findUnique({ where: { id: classId } });
    if (!cls) throw notFound('Class not found');
    assertBookable(cls);
    if (!cls.waitlistEnabled) throw badRequest('The waitlist is disabled for this class', 'WAITLIST_DISABLED');

    const existingBooking = await tx.booking.findFirst({ where: { userId, classId, status: 'CONFIRMED' } });
    if (existingBooking) throw conflict('You already have a confirmed booking for this class', 'ALREADY_BOOKED');

    const existingEntry = await tx.waitlistEntry.findFirst({ where: { userId, classId, status: 'WAITING' } });
    if (existingEntry) throw conflict('You are already on the waitlist for this class', 'ALREADY_WAITLISTED');

    const count = await confirmedCount(tx, classId);
    if (count < cls.capacity) {
      throw conflict('Seats are still available for this class — book directly instead of joining the waitlist', 'SEATS_AVAILABLE');
    }
    const waiting = await tx.waitlistEntry.count({ where: { classId, status: 'WAITING' } });
    if (waiting >= cls.waitlistLimit) throw conflict('The waitlist for this class is full', 'WAITLIST_FULL');

    const entry = await tx.waitlistEntry.create({
      data: { userId, classId, position: waiting + 1, status: 'WAITING' },
    });
    return { entry, cls };
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await notify({
    userId,
    title: 'Added to waitlist',
    message: `You are #${result.entry.position} on the waitlist for ${result.cls.title} (${classWhen(result.cls)}). We will promote you automatically if a seat opens.`,
    type: 'WAITLIST_JOINED',
    metadata: { classId, entryId: result.entry.id },
    emailSubject: 'FitBook — You are on the waitlist',
    emailHtml: user ? emailTemplates.waitlistJoined(user.name, result.cls.title, classWhen(result.cls), result.entry.position) : undefined,
  });
  emitClassEvent(classId, 'waitlist:joined', { classId });
  const availability = await emitAvailabilityNow(classId);
  await audit(userId, 'WAITLIST_JOINED', 'WaitlistEntry', result.entry.id, { classId, position: result.entry.position });
  return { entry: result.entry, availability };
}

/** Leave a waitlist; everyone behind moves up one position. */
export async function leaveWaitlist(userId: string, entryId: string, isAdmin = false) {
  const existing = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
  if (!existing) throw notFound('Waitlist entry not found');
  if (!isAdmin && existing.userId !== userId) throw forbidden('You can only leave your own waitlist entries');
  if (existing.status !== 'WAITING') throw badRequest('This waitlist entry is no longer active', 'ENTRY_NOT_ACTIVE');

  const outcome = await prisma.$transaction(async (tx) => {
    await lockClassRow(tx, existing.classId);
    const entry = await tx.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'CANCELLED' },
    });
    const remaining = await renumberWaitlist(tx, existing.classId);
    const cls = await tx.fitnessClass.findUnique({ where: { id: existing.classId } });
    return { entry, remaining, cls };
  });

  for (const e of outcome.remaining) {
    emitToUser(e.userId, 'waitlist:positionUpdated', { classId: existing.classId, entryId: e.id, position: e.position });
  }
  const availability = await emitAvailabilityNow(existing.classId);
  await audit(userId, 'WAITLIST_LEFT', 'WaitlistEntry', entryId, { classId: existing.classId });
  return { entry: outcome.entry, availability };
}

/** Admin manual promotion — same transaction-safe path as automatic promotion. */
export async function adminPromote(entryId: string, adminId: string) {
  const existing = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
  if (!existing) throw notFound('Waitlist entry not found');
  if (existing.status !== 'WAITING') throw badRequest('Only a WAITING entry can be promoted', 'ENTRY_NOT_ACTIVE');

  const outcome = await prisma.$transaction(async (tx) => {
    await lockClassRow(tx, existing.classId);
    const cls = await tx.fitnessClass.findUnique({ where: { id: existing.classId } });
    if (!cls) throw notFound('Class not found');
    const count = await confirmedCount(tx, existing.classId);
    if (count >= cls.capacity) throw conflict('This class is full — no seat is available for promotion', 'CLASS_FULL');
    const entry = await tx.waitlistEntry.findUnique({ where: { id: entryId }, include: { user: { select: { id: true, name: true, email: true } } } });
    if (!entry || entry.status !== 'WAITING') throw badRequest('This entry is no longer waiting', 'ENTRY_NOT_ACTIVE');
    const booking = await tx.booking.create({
      data: { userId: entry.userId, classId: cls.id, bookingReference: bookingReference(), status: 'CONFIRMED' },
    });
    const updated = await tx.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'PROMOTED', promotedAt: new Date() },
    });
    const remaining = await renumberWaitlist(tx, cls.id);
    return { cls, booking, entry: updated, promotedUser: entry.user, remaining };
  });

  await afterPromotion(outcome.cls, outcome);
  const availability = await emitAvailabilityNow(existing.classId);
  await audit(adminId, 'WAITLIST_MANUAL_PROMOTE', 'WaitlistEntry', entryId, { classId: existing.classId, bookingId: outcome.booking.id });
  return { booking: outcome.booking, entry: outcome.entry, availability };
}
