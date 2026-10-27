import { Resend } from 'resend';
import { IS_PRODUCTION, MAIL_FROM, MAIL_TO_LOG, RESEND_API_KEY } from '../config/index.js';
import { renderEmailHtml, renderEmailText } from './emailLayout.js';

const resend = RESEND_API_KEY && !MAIL_TO_LOG ? new Resend(RESEND_API_KEY) : null;

// Every email goes out as branded HTML plus a plain-text version, both carrying the contact details
export async function sendMail({ to, subject, text }) {
  const plainText = renderEmailText(text);
  if (!resend) {
    if (IS_PRODUCTION) throw new Error('RESEND_API_KEY is not configured');
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${plainText}\n`);
    return;
  }
  const { error } = await resend.emails.send({ from: MAIL_FROM, to, subject, text: plainText, html: renderEmailHtml({ subject, text }) });
  if (error) throw new Error(`Resend email failed: ${error.message}`);
}
