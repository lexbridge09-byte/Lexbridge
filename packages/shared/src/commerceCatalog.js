// Groupings for fixed-price catalogue products. `key` values are stored in the DB.
export const PRODUCT_CATEGORIES = [
  { key: 'property', label: 'Property', summary: 'Verification, sale deeds, rent agreements and registration support.' },
  { key: 'business', label: 'Business & startup', summary: 'Company formation, GST, trademarks and business contracts.' },
  { key: 'documents', label: 'Documents & agreements', summary: 'Legal notices, agreements, affidavits and contract reviews.' },
  { key: 'personal', label: 'Personal & family', summary: 'Wills, consumer complaints and everyday personal matters.' },
];

export const PRODUCT_CATEGORY_KEYS = PRODUCT_CATEGORIES.map((category) => category.key);

export const ORDER_STATUSES = ['created', 'paid', 'failed', 'refunded', 'partially-refunded', 'cancelled'];

// Orders where money was received (some or all of it may have been refunded since)
export const PAID_ORDER_STATUSES = ['paid', 'refunded', 'partially-refunded'];

export const ORDER_STATUS_LABELS = {
  created: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
  'partially-refunded': 'Partly refunded',
  cancelled: 'Cancelled',
};

export const COUPON_TYPES = ['percent', 'flat'];

export const CALLBACK_TIME_WINDOWS = [
  { key: 'now', label: 'As soon as possible' },
  { key: 'morning', label: 'Morning (9 am – 12 pm)' },
  { key: 'afternoon', label: 'Afternoon (12 – 4 pm)' },
  { key: 'evening', label: 'Evening (4 – 8 pm)' },
];

export const CALLBACK_TIME_WINDOW_KEYS = CALLBACK_TIME_WINDOWS.map((window) => window.key);

export const CALLBACK_STATUSES = ['new', 'called', 'no-answer', 'closed'];

export const DOCUMENT_REVIEW_STATUSES = ['queued', 'processing', 'completed', 'failed'];

export const DOCUMENT_REVIEW_RISK_LEVELS = ['low', 'moderate', 'high'];
