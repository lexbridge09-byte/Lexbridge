export const CONSULTATION_TYPES = [
  {
    key: 'quick',
    label: 'Quick consultation',
    summary: 'For a focused discussion about a specific legal question.',
  },
  {
    key: 'detailed',
    label: 'Detailed consultation',
    summary: 'For matters requiring more time to understand the circumstances and relevant documents.',
  },
  {
    key: 'document',
    label: 'Document consultation',
    summary: 'For discussing a document, notice, agreement or other legal paperwork.',
  },
];

export const CONSULTATION_TYPE_KEYS = CONSULTATION_TYPES.map((type) => type.key);

export const CONSULTATION_MODES = [
  { key: 'phone', label: 'Phone', summary: 'Discuss your matter over a scheduled call.' },
  { key: 'video', label: 'Video', summary: 'Meet over a video call. The link is shared before your consultation.' },
];

export const CONSULTATION_MODE_KEYS = CONSULTATION_MODES.map((mode) => mode.key);

export const CONSULTATION_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];

export const SLOT_STATUSES = ['open', 'booked', 'blocked'];

// All scheduling is in Indian Standard Time (UTC+05:30, no daylight saving)
export const APP_TIME_ZONE = 'Asia/Kolkata';
export const APP_UTC_OFFSET = '+05:30';

// Clients can cancel a scheduled consultation up to this many hours before it starts
export const CANCELLATION_NOTICE_HOURS = 2;
