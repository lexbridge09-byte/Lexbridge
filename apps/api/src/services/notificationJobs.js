import { BRAND, isFeatureEnabled } from '../brand/index.js';

// Building blocks shared by every notify* function

export const MAIL_FOOTER = `\n\n${BRAND.notLawFirmNotice}`;

export function findLabel(entries, key) {
  return entries.find((entry) => entry.key === key)?.label ?? key;
}

export function createEmailJob({ to, subject, text }) {
  return to ? { channel: 'email', payload: { to, subject, text } } : null;
}

export function createWhatsAppJob(isOptedIn, { to, templateName, bodyParams }) {
  if (!isOptedIn || !isFeatureEnabled('whatsAppNotifications')) return null;
  return { channel: 'whatsapp', payload: { to, templateName, bodyParams } };
}
