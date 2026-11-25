import nodemailer from 'nodemailer';
import { env, emailEnabled } from '../config/env';

const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
    <div style="background:#18181b;padding:20px 28px"><span style="color:#a3e635;font-size:22px;font-weight:800">FitBook</span></div>
    <div style="padding:28px">
      <h2 style="margin:0 0 12px;color:#18181b;font-size:20px">${title}</h2>
      <div style="color:#3f3f46;font-size:15px;line-height:1.6">${body}</div>
      <p style="margin-top:24px;color:#71717a;font-size:13px">Book your spot in real time — if a class fills up, our smart waitlist keeps you in the game.</p>
    </div>
  </div></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[email disabled] To: ${to} | Subject: ${subject}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html });
    return true;
  } catch (err) {
    console.error('[email] send failed:', err);
    return false;
  }
}

export const emailTemplates = {
  bookingConfirmed: (name: string, classTitle: string, when: string, ref: string) =>
    layout('Booking confirmed', `<p>Hi ${name},</p><p>Your spot in <strong>${classTitle}</strong> is confirmed for <strong>${when}</strong>.</p><p>Booking reference: <strong>${ref}</strong></p><p>Show this reference at the studio. See you there!</p>`),
  waitlistJoined: (name: string, classTitle: string, when: string, position: number) =>
    layout('You are on the waitlist', `<p>Hi ${name},</p><p><strong>${classTitle}</strong> (${when}) is currently full. You are at waitlist position <strong>#${position}</strong>.</p><p>If a spot opens, you will be promoted automatically and notified right away.</p>`),
  waitlistPromoted: (name: string, classTitle: string, when: string, ref: string) =>
    layout('Great news — you got the spot!', `<p>Hi ${name},</p><p>A spot opened in <strong>${classTitle}</strong> (${when}) and it is now <strong>yours</strong>.</p><p>Booking reference: <strong>${ref}</strong></p><p>Your booking is confirmed. See you in class!</p>`),
  bookingCancelled: (name: string, classTitle: string, when: string) =>
    layout('Booking cancelled', `<p>Hi ${name},</p><p>Your booking for <strong>${classTitle}</strong> (${when}) has been cancelled.</p><p>You can book another class any time from FitBook.</p>`),
  classCancelled: (name: string, classTitle: string, when: string) =>
    layout('Class cancelled', `<p>Hi ${name},</p><p>Unfortunately <strong>${classTitle}</strong> scheduled for <strong>${when}</strong> has been cancelled by the studio.</p><p>Any booking or waitlist entry for this class has been released. We apologise for the inconvenience.</p>`),
  classReminder: (name: string, classTitle: string, when: string) =>
    layout('Class reminder', `<p>Hi ${name},</p><p>Friendly reminder: <strong>${classTitle}</strong> starts at <strong>${when}</strong>. Arrive a few minutes early!</p>`),
  passwordReset: (name: string, link: string) =>
    layout('Reset your password', `<p>Hi ${name},</p><p>We received a request to reset your FitBook password. Click the link below within 1 hour:</p><p><a href="${link}" style="color:#65a30d;font-weight:bold">Reset password</a></p><p>If you did not request this, you can safely ignore this email.</p>`),
  verifyEmail: (name: string, link: string) =>
    layout('Verify your email', `<p>Hi ${name},</p><p>Welcome to FitBook! Please verify your email address:</p><p><a href="${link}" style="color:#65a30d;font-weight:bold">Verify email</a></p>`),
};
