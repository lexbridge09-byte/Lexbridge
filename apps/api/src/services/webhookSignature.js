import crypto from 'node:crypto';

const HEX_SHA256_PATTERN = /^[a-f0-9]{64}$/i;

/*
  Constant-time check of a hex HMAC-SHA256 signature computed over the raw request bytes.
  Meta sends `sha256=<hex>` in X-Hub-Signature-256; Razorpay sends `<hex>` in X-Razorpay-Signature.
*/
export function isValidHmacSignature({ rawBody, secret, signature, prefix = '' }) {
  if (!secret || typeof signature !== 'string' || !Buffer.isBuffer(rawBody)) return false;
  if (prefix && !signature.startsWith(prefix)) return false;
  const hex = signature.slice(prefix.length);
  if (!HEX_SHA256_PATTERN.test(hex)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(hex, 'hex'));
}

// Compares two secrets without leaking their length or contents through timing
export function isSameSecret(received, expected) {
  if (typeof received !== 'string' || !expected) return false;
  const receivedHash = crypto.createHash('sha256').update(received).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(receivedHash, expectedHash);
}
