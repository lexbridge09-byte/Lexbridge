import crypto from 'node:crypto';
import { RAZORPAY_API_BASE_URL, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../config/index.js';

const REQUEST_TIMEOUT_MS = 15_000;
const HEX_SHA256_PATTERN = /^[a-f0-9]{64}$/i;

/*
  Plain fetch with Basic auth rather than the `razorpay` SDK: we call three endpoints, signatures are a few
  lines of node:crypto, and it keeps the dependency list short.
  Payment Links: https://razorpay.com/docs/api/payments/payment-links/create-standard/
  Orders:        https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/
  Refunds:       https://razorpay.com/docs/api/refunds/create-normal/
*/
async function postToRazorpay(pathname, body, label) {
  const response = await fetch(`${RAZORPAY_API_BASE_URL}${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Razorpay ${label} failed (HTTP ${response.status}): ${data?.error?.description ?? 'unexpected response'}`);
    error.razorpayStatus = response.status;
    error.razorpayDescription = data?.error?.description ?? '';
    throw error;
  }
  return data;
}

export async function createRazorpayPaymentLink({ amountPaise, referenceId, description, expiresAt, notes }) {
  const data = await postToRazorpay('/v1/payment_links', {
    amount: amountPaise,
    currency: 'INR',
    accept_partial: false,
    reference_id: referenceId,
    description,
    expire_by: Math.floor(expiresAt.getTime() / 1000),
    reminder_enable: false,
    // The link is delivered in the WhatsApp chat, so Razorpay doesn't need to SMS or email it
    notify: { sms: false, email: false },
    notes,
  }, 'payment link');
  if (!data?.id || !data?.short_url) throw new Error('Razorpay payment link failed: unexpected response');
  return { id: data.id, shortUrl: data.short_url, status: data.status };
}

// Standard Checkout order. receipt is at most 40 characters; notes at most 15 keys.
export async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const data = await postToRazorpay('/v1/orders', { amount: amountPaise, currency: 'INR', receipt, notes }, 'order');
  if (typeof data?.id !== 'string') throw new Error('Razorpay order failed: unexpected response');
  return { id: data.id, amountPaise: data.amount, status: data.status };
}

// Omitting amountPaise refunds the full remaining amount. Status is pending, processed or failed.
export async function createRazorpayRefund({ paymentId, amountPaise, notes, receipt }) {
  const data = await postToRazorpay(
    `/v1/payments/${encodeURIComponent(paymentId)}/refund`,
    { amount: amountPaise, speed: 'normal', notes, receipt },
    'refund',
  );
  if (typeof data?.id !== 'string') throw new Error('Razorpay refund failed: unexpected response');
  return { id: data.id, amountPaise: data.amount, status: data.status ?? 'pending' };
}

// Checkout success: signature is hex HMAC-SHA256 of "<order_id>|<payment_id>" with the key secret
export function isValidCheckoutSignature({ orderId, paymentId, signature }) {
  if (!RAZORPAY_KEY_SECRET || typeof orderId !== 'string' || typeof paymentId !== 'string') return false;
  if (typeof signature !== 'string' || !HEX_SHA256_PATTERN.test(signature)) return false;
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
