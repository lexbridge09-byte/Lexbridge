import nodemailer from 'nodemailer';
import { IS_PRODUCTION, MAIL_FROM, SMTP_URL } from '../config/index.js';

const transporter = SMTP_URL ? nodemailer.createTransport(SMTP_URL) : null;

export async function sendMail({ to, subject, text }) {
  if (!transporter) {
    if (IS_PRODUCTION) throw new Error('SMTP_URL is not configured');
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from: MAIL_FROM, to, subject, text });
}
