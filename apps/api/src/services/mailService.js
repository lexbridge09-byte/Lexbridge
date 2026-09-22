import { Resend } from 'resend';
import { IS_PRODUCTION, MAIL_FROM, RESEND_API_KEY } from '../config/index.js';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendMail({ to, subject, text }) {
  if (!resend) {
    if (IS_PRODUCTION) throw new Error('RESEND_API_KEY is not configured');
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}\n`);
    return;
  }
  const { error } = await resend.emails.send({ from: MAIL_FROM, to, subject, text });
  if (error) throw new Error(`Resend email failed: ${error.message}`);
}
