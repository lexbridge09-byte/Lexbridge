// Retention: reminders, renewals, deadlines, feedback, referrals and consent

// Scheduled messages handled by the reminders worker
export const REMINDER_TYPES = [
  'document-renewal',
  'order-renewal',
  'checkout-recovery',
  'booking-recovery',
  'deadline',
  'feedback-csat',
  'feedback-nps',
];

// service = about something the person started (allowed without marketing consent); marketing = needs opt-in
export const REMINDER_CATEGORIES = ['service', 'marketing'];

export const REMINDER_STATUSES = ['pending', 'processing', 'sent', 'skipped', 'cancelled', 'failed'];

export const DOCUMENT_KINDS = [
  { key: 'rent-agreement', label: 'Rent agreement', defaultValidityMonths: 11 },
  { key: 'lease-deed', label: 'Lease deed' },
  { key: 'nda', label: 'Non-disclosure agreement' },
  { key: 'employment-agreement', label: 'Employment agreement' },
  { key: 'service-agreement', label: 'Service or vendor agreement' },
  { key: 'power-of-attorney', label: 'Power of attorney' },
  { key: 'trademark-registration', label: 'Trademark registration', defaultValidityMonths: 120 },
  { key: 'licence-registration', label: 'Licence or registration' },
  { key: 'insurance-policy', label: 'Insurance policy' },
  { key: 'other', label: 'Other document' },
];

export const DOCUMENT_KIND_KEYS = DOCUMENT_KINDS.map((kind) => kind.key);

export const DEADLINE_KINDS = [
  { key: 'hearing', label: 'Court hearing' },
  { key: 'reply-to-notice', label: 'Reply to a notice' },
  { key: 'filing', label: 'Filing or submission' },
  { key: 'payment', label: 'Payment due' },
  { key: 'other', label: 'Other' },
];

export const DEADLINE_KIND_KEYS = DEADLINE_KINDS.map((kind) => kind.key);

export const DEADLINE_STATUSES = ['active', 'done', 'cancelled'];

export const DEADLINE_SOURCES = ['client', 'consultation-notes'];

export const CONSULTATION_DRAFT_STATUSES = ['open', 'completed', 'abandoned'];

export const FEEDBACK_TYPES = ['csat', 'nps'];

export const FEEDBACK_STATUSES = ['pending', 'answered', 'expired', 'cancelled'];

// Marketing consent is kept per channel; service updates are about something the person started
export const CONSENT_CHANNELS = ['whatsapp', 'sms', 'email'];

export const CONSENT_CATEGORIES = ['service', 'marketing'];

export const REFERRAL_STATUSES = ['rewarded', 'rejected'];

// Most stages a catalogue product can define for its order timeline
export const ORDER_STAGE_LIMIT = 12;

/*
  Timing rules from the lifecycle messaging plan (UX_RESEARCH.md §5). Hours are in India time.
  - renewal: T-30, T-15 and T-3 days before a document or order expires
  - recovery: +1 h and +24 h after an unpaid order or an unfinished booking, then stop
  - deadlines: T-7 and T-1 days
  - feedback: service-ease question 24 h after completion; NPS at most once per 90 days per person
  - marketing: at most 2 per rolling 7 days, never between 21:00 and 09:00
*/
export const RETENTION_SCHEDULE = Object.freeze({
  renewalOffsetsDays: [30, 15, 3],
  recoveryOffsetsHours: [1, 24],
  deadlineOffsetsDays: [7, 1],
  feedbackDelayHours: 24,
  npsCooldownDays: 90,
  marketingWeeklyCap: 2,
  quietHoursStart: 21,
  quietHoursEnd: 9,
});
