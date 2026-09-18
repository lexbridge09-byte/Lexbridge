import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WHATSAPP_AI_PLAN } from '@lexbridge/shared';

const REQUIRED_KEYS = ['MONGO_URI', 'JWT_SECRET'];

for (const key of REQUIRED_KEYS) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

function readInt(name, fallback, { min = 0 } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) throw new Error(`${name} must be an integer >= ${min}`);
  return value;
}

function readBoolean(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const PORT = readInt('PORT', 5000, { min: 1 });
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';
export const TRUST_PROXY = process.env.TRUST_PROXY ?? 'loopback';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Automated tests only: enables test-only routes such as the reminder clock endpoint
export const IS_TEST = process.env.NODE_ENV === 'test';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const SMTP_URL = process.env.SMTP_URL ?? '';
export const MAIL_FROM = process.env.MAIL_FROM ?? 'LexBridge <no-reply@example.com>';

export const SESSION_COOKIE_NAME = 'lexbridge_session';

// MongoDB connection pool, per API process. Total connections = MONGO_MAX_POOL_SIZE x number of processes.
export const MONGO_MAX_POOL_SIZE = readInt('MONGO_MAX_POOL_SIZE', 50, { min: 1 });
export const MONGO_MIN_POOL_SIZE = readInt('MONGO_MIN_POOL_SIZE', 2);
export const MONGO_SERVER_SELECTION_TIMEOUT_MS = readInt('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000, { min: 1 });
export const MONGO_SOCKET_TIMEOUT_MS = readInt('MONGO_SOCKET_TIMEOUT_MS', 45000, { min: 1 });
// Building indexes at boot is convenient in development; production runs `pnpm db:sync-indexes` instead
export const MONGO_AUTO_INDEX = readBoolean('MONGO_AUTO_INDEX', !IS_PRODUCTION);

export const REQUEST_TIMEOUT_MS = readInt('REQUEST_TIMEOUT_MS', 30000, { min: 1000 });
export const UPLOAD_TIMEOUT_MS = readInt('UPLOAD_TIMEOUT_MS', 120000, { min: 1000 });
export const SHUTDOWN_TIMEOUT_MS = readInt('SHUTDOWN_TIMEOUT_MS', 15000, { min: 1000 });
// Worker processes for `pnpm start:cluster`
export const WEB_CONCURRENCY = readInt('WEB_CONCURRENCY', os.availableParallelism(), { min: 1 });

// Private document storage; never served statically
export const STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local';
if (!['local', 's3'].includes(STORAGE_DRIVER)) {
  throw new Error('STORAGE_DRIVER must be "local" or "s3"');
}
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || fileURLToPath(new URL('../../uploads', import.meta.url)),
);
// S3-compatible object storage (AWS S3, Cloudflare R2, MinIO)
export const S3_BUCKET = process.env.S3_BUCKET ?? '';
export const S3_REGION = process.env.S3_REGION || 'auto';
export const S3_ENDPOINT = process.env.S3_ENDPOINT ?? '';
export const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID ?? '';
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY ?? '';
export const S3_FORCE_PATH_STYLE = readBoolean('S3_FORCE_PATH_STYLE', false);
export const S3_KEY_PREFIX = process.env.S3_KEY_PREFIX ?? 'documents/';
if (STORAGE_DRIVER === 's3' && !S3_BUCKET) {
  throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3');
}

// Outbox worker that delivers queued emails and WhatsApp messages
export const NOTIFICATION_WORKER_ENABLED = readBoolean('NOTIFICATION_WORKER_ENABLED', true);
export const NOTIFICATION_POLL_INTERVAL_MS = readInt('NOTIFICATION_POLL_INTERVAL_MS', 2000, { min: 200 });
export const NOTIFICATION_MAX_ATTEMPTS = readInt('NOTIFICATION_MAX_ATTEMPTS', 8, { min: 1 });
export const NOTIFICATION_BATCH_SIZE = readInt('NOTIFICATION_BATCH_SIZE', 20, { min: 1 });

// WhatsApp Cloud API. Notifications are skipped unless both token and phone number ID are set.
export const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? '';
export const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
export const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';
export const WHATSAPP_TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

// Names of approved templates in WhatsApp Manager. Body variables are positional ({{1}}, {{2}}, ...).
export const WHATSAPP_TEMPLATES = {
  requestReceived: process.env.WHATSAPP_TEMPLATE_REQUEST_RECEIVED || 'request_received',
  requestStatusChanged: process.env.WHATSAPP_TEMPLATE_REQUEST_STATUS_CHANGED || 'request_status_changed',
  consultationBooked: process.env.WHATSAPP_TEMPLATE_CONSULTATION_BOOKED || 'consultation_booked',
  consultationCancelled: process.env.WHATSAPP_TEMPLATE_CONSULTATION_CANCELLED || 'consultation_cancelled',
  meetingLinkAdded: process.env.WHATSAPP_TEMPLATE_MEETING_LINK_ADDED || 'meeting_link_added',
  orderPaid: process.env.WHATSAPP_TEMPLATE_ORDER_PAID || 'order_paid',
  orderStageChanged: process.env.WHATSAPP_TEMPLATE_ORDER_STAGE_CHANGED || 'order_stage_changed',
  documentRenewal: process.env.WHATSAPP_TEMPLATE_DOCUMENT_RENEWAL || 'document_renewal',
  checkoutRecovery: process.env.WHATSAPP_TEMPLATE_CHECKOUT_RECOVERY || 'checkout_recovery',
  bookingRecovery: process.env.WHATSAPP_TEMPLATE_BOOKING_RECOVERY || 'booking_recovery',
  deadlineReminder: process.env.WHATSAPP_TEMPLATE_DEADLINE_REMINDER || 'deadline_reminder',
  consultationNotesReady: process.env.WHATSAPP_TEMPLATE_CONSULTATION_NOTES_READY || 'consultation_notes_ready',
  feedbackCsat: process.env.WHATSAPP_TEMPLATE_FEEDBACK_CSAT || 'feedback_csat',
  feedbackNps: process.env.WHATSAPP_TEMPLATE_FEEDBACK_NPS || 'feedback_nps',
};

// Graph API host; overridable so tests can point at a local mock
export const WHATSAPP_GRAPH_BASE_URL = (process.env.WHATSAPP_GRAPH_BASE_URL || 'https://graph.facebook.com').replace(/\/+$/, '');

// WhatsApp AI assistant (inbound chat). Off unless the token, phone number ID, app secret and verify token are all set.
export const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? '';
export const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
export const IS_WHATSAPP_AGENT_CONFIGURED = Boolean(
  WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_APP_SECRET && WHATSAPP_VERIFY_TOKEN,
);
export const WHATSAPP_AI_FREE_MESSAGES = readInt('WHATSAPP_AI_FREE_MESSAGES', WHATSAPP_AI_PLAN.freeMessages);
export const WHATSAPP_AI_PACK_MESSAGES = readInt('WHATSAPP_AI_PACK_MESSAGES', WHATSAPP_AI_PLAN.packMessages, { min: 1 });
export const WHATSAPP_AI_PACK_PRICE_PAISE = readInt('WHATSAPP_AI_PACK_PRICE_PAISE', WHATSAPP_AI_PLAN.packPricePaise, { min: 100 });
export const WHATSAPP_AI_MODEL = process.env.WHATSAPP_AI_MODEL || 'claude-opus-5';
export const WHATSAPP_AI_EFFORT = process.env.WHATSAPP_AI_EFFORT || 'low';
if (!['low', 'medium', 'high'].includes(WHATSAPP_AI_EFFORT)) {
  throw new Error('WHATSAPP_AI_EFFORT must be "low", "medium" or "high"');
}
export const WHATSAPP_AI_HISTORY_MESSAGES = readInt('WHATSAPP_AI_HISTORY_MESSAGES', 20, { min: 2 });
// Razorpay requires expire_by to be at least 15 minutes in the future
export const WHATSAPP_PAYMENT_LINK_TTL_MINUTES = readInt('WHATSAPP_PAYMENT_LINK_TTL_MINUTES', 1440, { min: 16 });
export const WHATSAPP_MESSAGE_RETENTION_DAYS = readInt('WHATSAPP_MESSAGE_RETENTION_DAYS', 365, { min: 1 });
export const WHATSAPP_INBOUND_WORKER_ENABLED = readBoolean('WHATSAPP_INBOUND_WORKER_ENABLED', true);
export const WHATSAPP_INBOUND_POLL_INTERVAL_MS = readInt('WHATSAPP_INBOUND_POLL_INTERVAL_MS', 1000, { min: 100 });
// Public website address used in links sent to people (e.g. the privacy policy)
export const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || CLIENT_ORIGIN).replace(/\/+$/, '');

// Razorpay Payment Links for WhatsApp question packs. Off unless key id, key secret and webhook secret are set.
export const RAZORPAY_API_BASE_URL = (process.env.RAZORPAY_API_BASE_URL || 'https://api.razorpay.com').replace(/\/+$/, '');
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? '';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
export const IS_RAZORPAY_CONFIGURED = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && RAZORPAY_WEBHOOK_SECRET);

// Razorpay Standard Checkout for catalogue orders needs only the API keys (the webhook secret is for webhooks)
export const IS_RAZORPAY_CHECKOUT_CONFIGURED = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

// AI document review
export const DOCUMENT_REVIEW_MODEL = process.env.DOCUMENT_REVIEW_MODEL || 'claude-opus-5';
export const DOCUMENT_REVIEW_EFFORT = process.env.DOCUMENT_REVIEW_EFFORT || 'medium';
if (!['low', 'medium', 'high', 'xhigh'].includes(DOCUMENT_REVIEW_EFFORT)) {
  throw new Error('DOCUMENT_REVIEW_EFFORT must be "low", "medium", "high" or "xhigh"');
}
// Reviews per client in a rolling 24 hours (failed reviews don't count)
export const DOCUMENT_REVIEW_DAILY_LIMIT = readInt('DOCUMENT_REVIEW_DAILY_LIMIT', 3, { min: 1 });
export const DOCUMENT_REVIEW_MAX_PAGES = readInt('DOCUMENT_REVIEW_MAX_PAGES', 50, { min: 1 });
// Uploaded files are deleted this many days after the review finishes, unless a lawyer review was requested
export const DOCUMENT_REVIEW_FILE_RETENTION_DAYS = readInt('DOCUMENT_REVIEW_FILE_RETENTION_DAYS', 7, { min: 1 });
export const DOCUMENT_REVIEW_MAX_ATTEMPTS = readInt('DOCUMENT_REVIEW_MAX_ATTEMPTS', 3, { min: 1 });
export const DOCUMENT_REVIEW_WORKER_ENABLED = readBoolean('DOCUMENT_REVIEW_WORKER_ENABLED', true);
export const DOCUMENT_REVIEW_POLL_INTERVAL_MS = readInt('DOCUMENT_REVIEW_POLL_INTERVAL_MS', 2000, { min: 100 });

// Callback requests: a repeat request from the same number within this window returns the pending one
export const CALLBACK_DEDUPE_MINUTES = readInt('CALLBACK_DEDUPE_MINUTES', 30, { min: 1 });

// Retention: scheduled reminders (defaults mirror RETENTION_SCHEDULE in @lexbridge/shared)
export const RETENTION_WORKER_ENABLED = readBoolean('RETENTION_WORKER_ENABLED', true);
export const RETENTION_POLL_INTERVAL_MS = readInt('RETENTION_POLL_INTERVAL_MS', 60000, { min: 200 });
export const RETENTION_BATCH_SIZE = readInt('RETENTION_BATCH_SIZE', 50, { min: 1 });
// Most marketing reminders one person gets in a rolling 7 days
export const MARKETING_WEEKLY_CAP = readInt('MARKETING_WEEKLY_CAP', 2);
// Quiet hours in India time. Marketing and non-urgent service reminders wait until QUIET_HOURS_END.
// Setting both to the same hour turns quiet hours off.
export const QUIET_HOURS_START = readInt('QUIET_HOURS_START', 21);
export const QUIET_HOURS_END = readInt('QUIET_HOURS_END', 9);
if (QUIET_HOURS_START > 23 || QUIET_HOURS_END > 23) throw new Error('QUIET_HOURS_START and QUIET_HOURS_END must be hours from 0 to 23');
// Feedback links stay valid this many days after they're sent
export const FEEDBACK_TOKEN_TTL_DAYS = readInt('FEEDBACK_TOKEN_TTL_DAYS', 14, { min: 1 });
export const NPS_COOLDOWN_DAYS = readInt('NPS_COOLDOWN_DAYS', 90, { min: 1 });
// Referrals: the friend's discount on a first order, and the referrer's reward coupon
export const REFERRAL_FRIEND_DISCOUNT_PAISE = readInt('REFERRAL_FRIEND_DISCOUNT_PAISE', 10000, { min: 100 });
export const REFERRAL_REFERRER_REWARD_PAISE = readInt('REFERRAL_REFERRER_REWARD_PAISE', 10000, { min: 100 });
export const REFERRAL_MIN_ORDER_PAISE = readInt('REFERRAL_MIN_ORDER_PAISE', 0);
export const REFERRAL_REWARD_VALID_DAYS = readInt('REFERRAL_REWARD_VALID_DAYS', 90, { min: 1 });

// Company details for the website footer (GET /api/public-config). Empty until set.
export const COMPANY_DETAILS = Object.freeze({
  legalName: process.env.COMPANY_LEGAL_NAME ?? '',
  cin: process.env.COMPANY_CIN ?? '',
  gstin: process.env.COMPANY_GSTIN ?? '',
  address: process.env.COMPANY_ADDRESS ?? '',
  grievanceOfficer: Object.freeze({
    name: process.env.GRIEVANCE_OFFICER_NAME ?? '',
    email: process.env.GRIEVANCE_OFFICER_EMAIL ?? '',
    phone: process.env.GRIEVANCE_OFFICER_PHONE ?? '',
  }),
  supportHours: process.env.SUPPORT_HOURS ?? '',
});
