import {
  CANCELLATION_NOTICE_HOURS,
  CONSULTATION_MODES,
  CONSULTATION_TYPES,
  REQUEST_STATUS_LABELS,
  SERVICE_CATALOG,
} from '@lexbridge/shared';
import { PUBLIC_SITE_URL, WHATSAPP_TEMPLATES } from '../config/index.js';
import { formatIstDateTime } from '../utils.js';
import { enqueueNotifications } from './notificationQueue.js';
import { sendMail } from './mailService.js';
import { MAIL_FOOTER, createEmailJob, createWhatsAppJob, findLabel } from './notificationJobs.js';

// Each notify* function queues its messages in the outbox and resolves once they're stored. None of them throw.
export function notifyRequestReceived(request) {
  const serviceLabel = findLabel(SERVICE_CATALOG, request.ServiceCategory);
  return enqueueNotifications('request-received', [
    createEmailJob({
      to: request.Email,
      subject: `We've received your request (${request.ReferenceCode})`,
      text: `Hello ${request.FullName},\n\nThank you for contacting LexBridge. Your ${serviceLabel} request has been received and will be reviewed by our team.\n\nReference: ${request.ReferenceCode}\n\nYou can follow its progress by signing in to My LexBridge with this email address.${MAIL_FOOTER}`,
    }),
    createWhatsAppJob(request.WhatsAppOptIn, {
      to: request.Phone,
      templateName: WHATSAPP_TEMPLATES.requestReceived,
      bodyParams: [request.FullName, request.ReferenceCode, serviceLabel],
    }),
  ]);
}

export function notifyRequestStatusChanged(request, note = '') {
  const statusLabel = REQUEST_STATUS_LABELS[request.Status] ?? request.Status;
  const noteText = note ? `\n\nMessage from our team:\n${note}` : '';
  return enqueueNotifications('request-status-changed', [
    createEmailJob({
      to: request.Email,
      subject: `Update on your request (${request.ReferenceCode})`,
      text: `Hello ${request.FullName},\n\nThere's an update on your LexBridge request ${request.ReferenceCode}.\n\nCurrent status: ${statusLabel}${noteText}\n\nSign in to My LexBridge to see the details.${MAIL_FOOTER}`,
    }),
    createWhatsAppJob(request.WhatsAppOptIn, {
      to: request.Phone,
      templateName: WHATSAPP_TEMPLATES.requestStatusChanged,
      bodyParams: [request.FullName, request.ReferenceCode, statusLabel],
    }),
  ]);
}

// Team onboarding: the owner invites 2nd owners, 2nd owners invite lawyers.
// Sending inline (not via the outbox) so the inviter sees failures immediately.
export async function sendInviteEmail(invite, inviter) {
  const roleLabel = invite.Role === 'manager' ? 'a 2nd owner (team lead)' : 'a lawyer / consultant';
  const inviterName = inviter?.FullName?.trim() || inviter?.Email || 'the LexBridge team';
  await sendMail({
    to: invite.Email,
    subject: `You're invited to LexBridge as ${invite.Role === 'manager' ? 'a 2nd owner' : 'a lawyer'}`,
    text: `Hello,

${inviterName} has invited you to join LexBridge as ${roleLabel}.

Sign in with this email address at ${PUBLIC_SITE_URL}/login — enter your email, and we'll send you a sign-in code. Your team access activates automatically on your first sign-in.

This invitation expires on ${new Date(invite.expiresAt).toDateString()}.${MAIL_FOOTER}`,
  });
}

// Sent when the team uploads the finished work (draft, filing, advice) to a client's request
export function notifyDeliverableReady(request, documentName) {
  return enqueueNotifications('deliverable-ready', [
    createEmailJob({
      to: request.Email,
      subject: `Your document is ready (${request.ReferenceCode})`,
      text: `Hello ${request.FullName},

The finished work for your LexBridge request ${request.ReferenceCode} is ready.

File: ${documentName}

Sign in to My LexBridge to view and download it from your request page.${MAIL_FOOTER}`,
    }),
    createWhatsAppJob(request.WhatsAppOptIn, {
      to: request.Phone,
      templateName: WHATSAPP_TEMPLATES.requestStatusChanged,
      bodyParams: [request.FullName, request.ReferenceCode, 'Completed'],
    }),
  ]);
}

export function notifyConsultationBooked(consultation, client) {
  const clientName = client?.FullName || 'there';
  const startsAtText = formatIstDateTime(consultation.StartsAt);
  const modeLabel = findLabel(CONSULTATION_MODES, consultation.Mode);
  const typeLabel = findLabel(CONSULTATION_TYPES, consultation.ConsultationType);
  const modeText = consultation.Mode === 'phone'
    ? `We'll call you on ${consultation.Phone} at the scheduled time.`
    : "We'll share the video call link before your consultation. You'll find it in My LexBridge and in your email.";

  return enqueueNotifications('consultation-booked', [
    createEmailJob({
      to: client?.Email,
      subject: `Consultation booked for ${startsAtText} (${consultation.ReferenceCode})`,
      text: `Hello ${clientName},\n\nYour ${typeLabel.toLowerCase()} is booked.\n\nWhen: ${startsAtText}\nDuration: ${consultation.DurationMinutes} minutes\nMode: ${modeLabel}\nReference: ${consultation.ReferenceCode}\n\n${modeText}\n\nPlease keep relevant documents and information ready. You can cancel from My LexBridge up to ${CANCELLATION_NOTICE_HOURS} hours before the start time.${MAIL_FOOTER}`,
    }),
    createWhatsAppJob(consultation.WhatsAppOptIn, {
      to: consultation.Phone,
      templateName: WHATSAPP_TEMPLATES.consultationBooked,
      bodyParams: [clientName, consultation.ReferenceCode, startsAtText, modeLabel],
    }),
  ]);
}

export function notifyConsultationCancelled(consultation, client, cancelledBy) {
  const clientName = client?.FullName || 'there';
  const startsAtText = formatIstDateTime(consultation.StartsAt);
  const reasonText = cancelledBy === 'team'
    ? 'Our team has cancelled this consultation. We will contact you to arrange another time if needed.'
    : 'Your consultation has been cancelled as requested.';

  return enqueueNotifications('consultation-cancelled', [
    createEmailJob({
      to: client?.Email,
      subject: `Consultation cancelled (${consultation.ReferenceCode})`,
      text: `Hello ${clientName},\n\n${reasonText}\n\nWas scheduled for: ${startsAtText}\nReference: ${consultation.ReferenceCode}\n\nYou can book a new time from the LexBridge website.${MAIL_FOOTER}`,
    }),
    createWhatsAppJob(consultation.WhatsAppOptIn, {
      to: consultation.Phone,
      templateName: WHATSAPP_TEMPLATES.consultationCancelled,
      bodyParams: [clientName, consultation.ReferenceCode, startsAtText],
    }),
  ]);
}

export function notifyMeetingLinkAdded(consultation, client) {
  const clientName = client?.FullName || 'there';
  const startsAtText = formatIstDateTime(consultation.StartsAt);

  return enqueueNotifications('meeting-link-added', [
    createEmailJob({
      to: client?.Email,
      subject: `Video link for your consultation on ${startsAtText}`,
      text: `Hello ${clientName},\n\nHere is the video call link for your consultation (${consultation.ReferenceCode}) on ${startsAtText}:\n\n${consultation.MeetingLink}\n\nPlease join a few minutes early and keep relevant documents ready.${MAIL_FOOTER}`,
    }),
    createWhatsAppJob(consultation.WhatsAppOptIn, {
      to: consultation.Phone,
      templateName: WHATSAPP_TEMPLATES.meetingLinkAdded,
      bodyParams: [clientName, startsAtText, consultation.MeetingLink],
    }),
  ]);
}
