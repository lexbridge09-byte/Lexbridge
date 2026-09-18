import {
  IS_PRODUCTION,
  WHATSAPP_API_VERSION,
  WHATSAPP_GRAPH_BASE_URL,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_TEMPLATE_LANGUAGE,
  WHATSAPP_TOKEN,
} from '../config/index.js';
import { logger } from '../logger.js';

const SEND_TIMEOUT_MS = 10_000;
// WhatsApp rejects text bodies longer than this
const MAX_TEXT_BODY_CHARACTERS = 4096;

// WhatsApp expects E.164 digits without '+'. Bare 10-digit numbers are treated as Indian (+91).
export function normalizePhoneForWhatsApp(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

function isWhatsAppConfigured() {
  return Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
}

// POSTs to the Cloud API messages endpoint. Never throws.
async function postToMessagesEndpoint(body) {
  try {
    const response = await fetch(
      `${WHATSAPP_GRAPH_BASE_URL}/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      // A 4xx other than rate limiting means the request itself is wrong (template, token, number or
      // a message outside the 24-hour customer service window), so retrying won't help
      const isPermanent = response.status >= 400 && response.status < 500 && response.status !== 429;
      return {
        status: 'failed',
        isPermanent,
        error: `HTTP ${response.status}: ${data?.error?.message ?? 'unknown error'}`,
      };
    }
    return { status: 'sent', messageId: data?.messages?.[0]?.id ?? '' };
  } catch (err) {
    return { status: 'failed', isPermanent: false, error: err.message };
  }
}

/*
  Never throws. Resolves to one of:
  - { status: 'sent', messageId } when Meta accepted the message
  - { status: 'skipped', reason } when WhatsApp isn't configured or the number can't be used
  - { status: 'failed', error, isPermanent }; permanent failures shouldn't be retried
*/
export async function sendWhatsAppTemplate({ to, templateName, bodyParams = [] }) {
  const recipient = normalizePhoneForWhatsApp(to);
  if (!recipient) {
    logger.warn({ templateName }, '[whatsapp] skipped: invalid phone number');
    return { status: 'skipped', reason: 'invalid phone number' };
  }

  if (!isWhatsAppConfigured()) {
    if (!IS_PRODUCTION) {
      console.log(`[whatsapp:dev] to=${recipient} template=${templateName} params=${JSON.stringify(bodyParams)}`);
    }
    return { status: 'skipped', reason: 'not configured' };
  }

  const template = { name: templateName, language: { code: WHATSAPP_TEMPLATE_LANGUAGE } };
  if (bodyParams.length > 0) {
    template.components = [
      { type: 'body', parameters: bodyParams.map((value) => ({ type: 'text', text: String(value) })) },
    ];
  }

  return postToMessagesEndpoint({ recipient_type: 'individual', to: recipient, type: 'template', template });
}

/*
  Free-form text reply. Only allowed inside the 24-hour customer service window that opens when the
  person messages the business. Same result shape as sendWhatsAppTemplate. Never throws.
*/
export async function sendWhatsAppText({ to, body }) {
  const recipient = normalizePhoneForWhatsApp(to);
  if (!recipient) return { status: 'skipped', reason: 'invalid phone number' };

  if (!isWhatsAppConfigured()) {
    if (!IS_PRODUCTION) console.log(`[whatsapp:dev] to=${recipient} text=${JSON.stringify(body)}`);
    return { status: 'skipped', reason: 'not configured' };
  }

  return postToMessagesEndpoint({
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: { preview_url: false, body: String(body).slice(0, MAX_TEXT_BODY_CHARACTERS) },
  });
}

// Marks an inbound message as read and, optionally, shows "typing…" for up to 25 s. Best effort; never throws.
export async function markWhatsAppMessageRead({ messageId, showTyping = false }) {
  if (!isWhatsAppConfigured() || !messageId) return false;
  const body = { status: 'read', message_id: messageId };
  if (showTyping) body.typing_indicator = { type: 'text' };
  const result = await postToMessagesEndpoint(body);
  if (result.status === 'failed') logger.debug({ error: result.error }, '[whatsapp] mark as read failed');
  return result.status === 'sent';
}
