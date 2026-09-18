// The single switchboard for LexBridge features.
// Flip a value here and both the website (apps/web) and the API (apps/api) follow after a restart/rebuild.
export const FEATURE_FLAGS = Object.freeze({
  // AI "Find my legal solution" triage
  solutionFinder: true,
  // Email sign-in and the My LexBridge client dashboard
  clientAccounts: true,
  // Consultation slot booking (public page, dashboard and admin slots/consultations)
  consultationBooking: true,
  // Legal drafting page and drafting requests
  legalDrafting: true,
  // Legal Insights articles (public pages and admin editor)
  legalInsights: true,
  // Document upload and download (client and admin)
  documentUploads: true,
  // Floating WhatsApp click-to-chat button and WhatsApp contact links
  whatsAppChatButton: true,
  // WhatsApp template updates for requests and consultations
  whatsAppNotifications: true,
  // Paid WhatsApp AI assistant with Razorpay question packs
  whatsAppAiAssistant: true,
  // Fixed-price service catalogue (public product pages and admin product editor)
  serviceCatalog: true,
  // Online payments for catalogue orders with Razorpay Checkout (orders, receipts, refunds)
  onlinePayments: true,
  // Coupon codes at checkout
  coupons: true,
  // AI document review reports for signed-in clients
  aiDocumentReview: true,
  // "Call me back" requests handled by the team
  callbackRequests: true,
  // Scheduled reminders engine (quiet hours, consent and frequency caps); the retention features below build on it
  reminders: false,
  // Document and order expiry dates with renewal reminders at T-30/T-15/T-3 days
  documentRenewals: false,
  // One reminder at +1 h and one at +24 h for unpaid orders and unfinished consultation bookings
  bookingRecovery: false,
  // Post-consultation notes, and client deadlines/hearing dates with T-7/T-1 day reminders
  consultationNotes: false,
  // Service-ease question after a service and NPS at most once per 90 days, answered from a link
  feedback: false,
  // Two-sided referral codes, offered after positive feedback
  referrals: false,
});

// A feature is only on when everything it relies on is also on
const FEATURE_DEPENDENCIES = Object.freeze({
  consultationBooking: ['clientAccounts'],
  documentUploads: ['clientAccounts'],
  onlinePayments: ['serviceCatalog'],
  coupons: ['onlinePayments'],
  aiDocumentReview: ['clientAccounts'],
  documentRenewals: ['reminders'],
  bookingRecovery: ['reminders'],
  consultationNotes: ['reminders', 'consultationBooking'],
  feedback: ['reminders'],
  referrals: ['onlinePayments', 'coupons', 'clientAccounts'],
});

export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS);

/*
  Test-only overrides so automated tests can switch features without editing this file, e.g.
  FEATURE_FLAGS_OVERRIDE='{"coupons":false}'. Honoured only when NODE_ENV is "test"; ignored everywhere else.
*/
function readTestOverrides() {
  const env = globalThis.process?.env;
  if (env?.NODE_ENV !== 'test' || !env.FEATURE_FLAGS_OVERRIDE) return {};
  const overrides = JSON.parse(env.FEATURE_FLAGS_OVERRIDE);
  return Object.fromEntries(
    Object.entries(overrides).filter(([featureKey, value]) => Object.hasOwn(FEATURE_FLAGS, featureKey) && typeof value === 'boolean'),
  );
}

const EFFECTIVE_FLAGS = Object.freeze({ ...FEATURE_FLAGS, ...readTestOverrides() });

export function isFeatureEnabled(featureKey) {
  if (!Object.hasOwn(FEATURE_FLAGS, featureKey)) {
    throw new Error(`Unknown feature flag: ${featureKey}`);
  }
  const dependencies = FEATURE_DEPENDENCIES[featureKey] ?? [];
  return EFFECTIVE_FLAGS[featureKey] && dependencies.every((dependency) => isFeatureEnabled(dependency));
}

// Effective on/off state for every feature, after dependencies are applied
export function getEnabledFeatures() {
  return Object.fromEntries(FEATURE_FLAG_KEYS.map((featureKey) => [featureKey, isFeatureEnabled(featureKey)]));
}
