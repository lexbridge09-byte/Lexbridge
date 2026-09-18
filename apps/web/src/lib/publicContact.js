// Public contact details. NEXT_PUBLIC_* values are inlined at build time, so they must be read literally.
function normalizeValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export const SUPPORT_PHONE = normalizeValue(process.env.NEXT_PUBLIC_SUPPORT_PHONE);
export const SUPPORT_EMAIL = normalizeValue(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
export const WHATSAPP_NUMBER = normalizeValue(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
export const INSTAGRAM_URL = normalizeValue(process.env.NEXT_PUBLIC_INSTAGRAM_URL);

// Returns '' when no WhatsApp number is configured, so callers can hide the link
export function deriveWhatsAppHref(prefilledText = '') {
  const digits = WHATSAPP_NUMBER.replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}${prefilledText ? `?text=${encodeURIComponent(prefilledText)}` : ''}`;
}

export function deriveTelHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function getContactLinks(dictionary) {
  const labels = dictionary.common.contactLinks;
  return [
    SUPPORT_EMAIL && { href: `mailto:${SUPPORT_EMAIL}`, label: labels.email, isExternal: true },
    SUPPORT_PHONE && { href: deriveTelHref(SUPPORT_PHONE), label: labels.phone, isExternal: true },
    WHATSAPP_NUMBER && { href: deriveWhatsAppHref(dictionary.whatsapp.greeting), label: labels.whatsApp, isExternal: true },
    INSTAGRAM_URL && { href: INSTAGRAM_URL, label: labels.instagram, isExternal: true },
  ].filter(Boolean);
}
