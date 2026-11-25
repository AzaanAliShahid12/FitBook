import { prisma } from '../config/db';
import { classWhen, notify } from '../services/notificationService';
import { emailTemplates } from '../utils/email';

/**
 * Every 30 minutes: remind members whose confirmed class starts within the
 * next hour (and has not been reminded about in the last 2 hours).
 */
export function startReminderJob() {
  const run = async () => {
    try {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      const classes = await prisma.fitnessClass.findMany({
        where: { status: 'PUBLISHED', startTime: { gte: now, lte: inOneHour } },
        include: { bookings: { where: { status: 'CONFIRMED' }, include: { user: true } } },
      });
      for (const cls of classes) {
        for (const booking of cls.bookings) {
          const recent = await prisma.notification.findFirst({
            where: {
              userId: booking.userId,
              type: 'CLASS_REMINDER',
              createdAt: { gte: new Date(now.getTime() - 2 * 3600 * 1000) },
              metadata: { path: ['classId'], equals: cls.id },
            },
          });
          if (recent) continue;
          await notify({
            userId: booking.userId,
            title: 'Class reminder',
            message: `${cls.title} starts soon (${classWhen(cls)}). See you there!`,
            type: 'CLASS_REMINDER',
            metadata: { classId: cls.id, bookingId: booking.id },
            emailSubject: 'FitBook — Class reminder',
            emailHtml: emailTemplates.classReminder(booking.user.name, cls.title, classWhen(cls)),
          });
        }
      }
    } catch (err) {
      console.error('[reminder job]', err);
    }
  };
  const timer = setInterval(run, 30 * 60 * 1000);
  timer.unref();
  return timer;
}
