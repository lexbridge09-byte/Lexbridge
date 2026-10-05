/*
  Intake catalog: subtype-specific questions for service requests, consultations and document
  reviews, so the 2nd owner can assign the right lawyer knowing the actual matter.

  Structure over wording: this file defines field KEYS, types and option keys; every label and
  option text lives in the website dictionaries (apps/web/src/brand/copy/{en,hi}/intake.js),
  checked for en/hi parity by the i18n build step.
*/

export const INTAKE_FIELD_TYPES = ['text', 'textarea', 'select', 'date'];

const f = (key, type, { required = false, options = undefined, maxLength = 300 } = {}) => ({ key, type, required, options, maxLength });

export const INTAKE_SUBTYPES = {
  // ---- Civil & property ----
  'property-dispute': {
    category: 'civil-property',
    fields: [
      f('propertyType', 'select', { required: true, options: ['residential', 'commercial', 'agricultural', 'plot'] }),
      f('disputeNature', 'select', { required: true, options: ['title-ownership', 'partition', 'encroachment', 'possession', 'builder-delay'] }),
      f('propertyCity', 'text', { required: true, maxLength: 80 }),
      f('opposingPartyKnown', 'select', { options: ['yes', 'no'] }),
      f('amountAtStake', 'select', { options: ['under-1-lakh', '1-10-lakh', '10-lakh-1-crore', 'above-1-crore'] }),
    ],
  },
  'landlord-tenant': {
    category: 'civil-property',
    fields: [
      f('yourRole', 'select', { required: true, options: ['landlord', 'tenant'] }),
      f('issue', 'select', { required: true, options: ['rent-default', 'eviction', 'deposit-refund', 'repair-dispute'] }),
      f('propertyCity', 'text', { required: true, maxLength: 80 }),
      f('agreementExists', 'select', { options: ['yes', 'no'] }),
    ],
  },
  'title-verification': {
    category: 'civil-property',
    fields: [
      f('propertyType', 'select', { required: true, options: ['residential', 'commercial', 'agricultural', 'plot'] }),
      f('propertyCity', 'text', { required: true, maxLength: 80 }),
      f('purpose', 'select', { required: true, options: ['buying', 'selling', 'loan', 'inheritance'] }),
    ],
  },

  // ---- Consumer matters ----
  'defective-product': {
    category: 'consumer-matters',
    fields: [
      f('productType', 'text', { required: true, maxLength: 120 }),
      f('vendorName', 'text', { maxLength: 120 }),
      f('amountAtStake', 'select', { required: true, options: ['under-10k', '10k-1-lakh', '1-10-lakh', 'above-10-lakh'] }),
      f('complaintFiledBefore', 'select', { options: ['yes', 'no'] }),
    ],
  },
  'deficient-service': {
    category: 'consumer-matters',
    fields: [
      f('serviceType', 'select', { required: true, options: ['builder', 'insurance', 'banking', 'transport', 'telecom', 'other'] }),
      f('providerName', 'text', { maxLength: 120 }),
      f('amountAtStake', 'select', { required: true, options: ['under-10k', '10k-1-lakh', '1-10-lakh', 'above-10-lakh'] }),
      f('complaintFiledBefore', 'select', { options: ['yes', 'no'] }),
    ],
  },
  'refund-dispute': {
    category: 'consumer-matters',
    fields: [
      f('whatRefund', 'text', { required: true, maxLength: 150 }),
      f('amountAtStake', 'select', { required: true, options: ['under-10k', '10k-1-lakh', '1-10-lakh', 'above-10-lakh'] }),
      f('sellerType', 'select', { options: ['online', 'offline', 'both'] }),
    ],
  },

  // ---- Criminal law ----
  'cheque-bounce': {
    category: 'criminal-law',
    fields: [
      f('chequeAmount', 'text', { required: true, maxLength: 60 }),
      f('chequeDate', 'date', { required: true }),
      f('bankName', 'text', { required: true, maxLength: 80 }),
      f('noticeSent', 'select', { required: true, options: ['yes', 'no'] }),
      f('daysSinceDishonour', 'select', { options: ['under-30', '30-90', 'over-90'] }),
    ],
  },
  'fir-bail': {
    category: 'criminal-law',
    fields: [
      f('firRegistered', 'select', { required: true, options: ['yes', 'no'] }),
      f('policeStation', 'text', { maxLength: 120 }),
      f('offenceType', 'text', { required: true, maxLength: 150 }),
      f('custodyStatus', 'select', { options: ['not-arrested', 'in-custody', 'released'] }),
    ],
  },
  'cyber-crime': {
    category: 'criminal-law',
    fields: [
      f('fraudType', 'select', { required: true, options: ['online-payment-fraud', 'job-scam', 'investment-scam', 'identity-theft', 'other'] }),
      f('amountLost', 'text', { maxLength: 60 }),
      f('platform', 'text', { maxLength: 120 }),
      f('complaintFiledBefore', 'select', { options: ['yes', 'no'] }),
    ],
  },

  // ---- Contract review ----
  'employment-contract': {
    category: 'contract-review',
    fields: [
      f('roleLevel', 'select', { required: true, options: ['junior', 'mid', 'senior', 'leadership'] }),
      f('contractStage', 'select', { required: true, options: ['offer-received', 'signed', 'working-under-it'] }),
      f('employerType', 'select', { options: ['startup', 'company', 'government', 'foreign'] }),
    ],
  },
  'vendor-contract': {
    category: 'contract-review',
    fields: [
      f('contractStage', 'select', { required: true, options: ['drafting', 'received-for-review', 'signed'] }),
      f('valueRange', 'select', { options: ['under-1-lakh', '1-10-lakh', 'above-10-lakh'] }),
    ],
  },
  nda: {
    category: 'contract-review',
    fields: [
      f('purpose', 'select', { required: true, options: ['hiring', 'vendor', 'investor', 'partnership'] }),
      f('contractStage', 'select', { required: true, options: ['drafting', 'received-for-review', 'signed'] }),
    ],
  },
  'rental-agreement': {
    category: 'contract-review',
    fields: [
      f('propertyType', 'select', { required: true, options: ['residential', 'commercial'] }),
      f('propertyCity', 'text', { required: true, maxLength: 80 }),
      f('contractStage', 'select', { required: true, options: ['drafting', 'received-for-review', 'signed'] }),
    ],
  },

  // ---- Business & corporate ----
  'company-incorporation': {
    category: 'business-corporate',
    fields: [
      f('entityType', 'select', { required: true, options: ['pvt-ltd', 'llp', 'opc', 'partnership'] }),
      f('foundersCount', 'select', { options: ['1', '2', '3-plus'] }),
    ],
  },
  'compliance-notice': {
    category: 'business-corporate',
    fields: [
      f('authority', 'select', { required: true, options: ['gst', 'income-tax', 'roc', 'labour', 'other'] }),
      f('noticeType', 'text', { required: true, maxLength: 150 }),
      f('responseDeadline', 'date', { options: undefined }),
    ],
  },

  // ---- Drafting (maps the drafting page's document types) ----
  'legal-notice': {
    category: 'legal-drafting',
    fields: [
      f('noticeAgainst', 'text', { required: true, maxLength: 150 }),
      f('noticeMatter', 'select', { required: true, options: ['payment-due', 'property', 'consumer', 'employment', 'other'] }),
    ],
  },
  agreement: {
    category: 'legal-drafting',
    fields: [
      f('agreementType', 'text', { required: true, maxLength: 120 }),
      f('partiesCount', 'select', { options: ['2', '3-plus'] }),
      f('language', 'select', { options: ['english', 'hindi', 'bilingual'] }),
    ],
  },
  affidavit: {
    category: 'legal-drafting',
    fields: [
      f('affidavitPurpose', 'text', { required: true, maxLength: 150 }),
      f('language', 'select', { options: ['english', 'hindi', 'bilingual'] }),
    ],
  },
  application: {
    category: 'legal-drafting',
    fields: [
      f('applicationTo', 'text', { required: true, maxLength: 150 }),
      f('applicationMatter', 'text', { required: true, maxLength: 200 }),
    ],
  },
  complaint: {
    category: 'legal-drafting',
    fields: [
      f('complaintAgainst', 'text', { required: true, maxLength: 150 }),
      f('forum', 'select', { options: ['consumer-commission', 'police', 'court', 'other'] }),
    ],
  },
  'other-document': {
    category: 'legal-drafting',
    fields: [f('documentDescription', 'text', { required: true, maxLength: 200 })],
  },

  // ---- Document review (uploaded file context) ----
  'document-review': {
    category: null,
    fields: [
      f('documentType', 'select', { required: true, options: ['agreement', 'notice', 'employment-contract', 'rental-agreement', 'court-papers', 'other'] }),
      f('matterArea', 'select', { options: ['family', 'property', 'employment', 'business', 'criminal', 'consumer', 'other'] }),
      f('urgency', 'select', { required: true, options: ['normal', 'this-week', 'urgent'] }),
      f('deadline', 'date'),
    ],
  },

  // ---- Consultation (used by the booking topic step) ----
  'general-advice': {
    category: 'legal-consultation',
    fields: [f('topicArea', 'select', { required: true, options: ['family', 'property', 'employment', 'business', 'criminal', 'consumer', 'other'] })],
  },
  'case-opinion': {
    category: 'legal-consultation',
    fields: [
      f('topicArea', 'select', { required: true, options: ['family', 'property', 'employment', 'business', 'criminal', 'consumer', 'other'] }),
      f('caseStage', 'select', { options: ['notice-received', 'case-filed', 'hearing-ongoing', 'appeal'] }),
    ],
  },
  'document-consultation': {
    category: 'legal-consultation',
    fields: [
      f('topicArea', 'select', { required: true, options: ['family', 'property', 'employment', 'business', 'criminal', 'consumer', 'other'] }),
      f('documentCount', 'select', { options: ['1', '2-5', 'more-than-5'] }),
    ],
  },
};

// Subtypes shown for a category, in display order. 'other' is always appended by the UI.
export function getIntakeSubtypes(category) {
  return Object.entries(INTAKE_SUBTYPES)
    .filter(([, definition]) => definition.category === category)
    .map(([key]) => key);
}

export function getIntakeFields(subtypeKey) {
  return INTAKE_SUBTYPES[subtypeKey]?.fields ?? null;
}

const MAX_DETAIL_LENGTH = 300;

/*
  Server-side whitelist: keeps only known field keys for the chosen subtype, coerces values to
  short strings (or ISO date strings), and reports missing required fields.
  Returns { ok: true, details } or { ok: false, missing: [fieldKeys] }.
*/
export function sanitizeIntakeDetails(subtypeKey, rawDetails) {
  const fields = getIntakeFields(subtypeKey);
  if (!fields) return { ok: true, details: {} };
  if (rawDetails === undefined || rawDetails === null || typeof rawDetails !== 'object' || Array.isArray(rawDetails)) {
    return { ok: false, missing: fields.filter((field) => field.required).map((field) => field.key) };
  }

  const details = {};
  const missing = [];
  for (const field of fields) {
    const raw = rawDetails[field.key];
    const value = typeof raw === 'string' ? raw.trim().slice(0, field.maxLength ?? MAX_DETAIL_LENGTH) : '';
    if (!value) {
      if (field.required) missing.push(field.key);
      continue;
    }
    if (field.type === 'select' && field.options && !field.options.includes(value)) continue;
    details[field.key] = value;
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, details };
}

// Client-side display: unknown keys and empty values are dropped
export function getDisplayableIntakeDetails(subtypeKey, details) {
  const fields = getIntakeFields(subtypeKey);
  if (!fields || !details || typeof details !== 'object') return [];
  return fields
    .filter((field) => details[field.key])
    .map((field) => ({ key: field.key, type: field.type, value: details[field.key] }));
}
