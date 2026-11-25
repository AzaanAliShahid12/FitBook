import { NotificationType } from '@prisma/client';
import { prisma } from '../config/db';
import { emitToUser } from '../socket';
import { sendEmail } from '../utils/email';

interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  emailHtml?: string;
  emailSubject?: string;
}

/** Creates an in-app notification, pushes it over Socket.IO and optionally emails it. */
export async function notify(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      metadata: (input.metadata ?? undefined) as object | undefined,
    },
  });
  emitToUser(input.userId, 'notification:new', notification);
  if (input.emailHtml && input.emailSubject) {
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
    if (user) void sendEmail(user.email, input.emailSubject, input.emailHtml);
  }
  return notification;
}

export function classWhen(fitnessClass: { date: Date; startTime: Date }) {
  const d = new Date(fitnessClass.date);
  const t = new Date(fitnessClass.startTime);
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${t.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}`;
}
