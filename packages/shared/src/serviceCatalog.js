// Mirrors the service areas on the public site. `key` values are stored in the DB.
export const SERVICE_CATALOG = [
  {
    key: 'legal-consultation',
    label: 'Legal Consultation',
    summary: 'General consultations, preliminary matter assessment, document discussion, procedural guidance and understanding available legal options.',
  },
  {
    key: 'legal-drafting',
    label: 'Legal Drafting',
    summary: 'Legal notices, agreements, affidavits, applications, representations, complaints, declarations and other legal documentation.',
  },
  {
    key: 'contract-review',
    label: 'Contract Review',
    summary: 'Review of employment, service, vendor, rental, non-disclosure, business and other commercial agreements before signing.',
  },
  {
    key: 'criminal-law',
    label: 'Criminal Law',
    summary: 'FIR-related matters, bail-related assistance, criminal complaints, criminal procedure and related documentation.',
  },
  {
    key: 'civil-property',
    label: 'Civil & Property',
    summary: 'Property-related disputes, recovery matters, civil disputes, notices, agreements and related documentation.',
  },
  {
    key: 'consumer-matters',
    label: 'Consumer Matters',
    summary: 'Defective products, deficiency in services, refund disputes, consumer complaints and legal notices.',
  },
  {
    key: 'business-corporate',
    label: 'Business & Corporate',
    summary: 'Business agreements, NDAs, employment and vendor documentation, contract review and corporate documentation.',
  },
  {
    key: 'other',
    label: 'Other',
    summary: 'Requirements that do not fit any of the categories above.',
  },
];

export const SERVICE_CATEGORY_KEYS = SERVICE_CATALOG.map((service) => service.key);

export const REQUEST_STATUSES = [
  'submitted',
  'under-review',
  'in-progress',
  'awaiting-client',
  'completed',
  'closed',
];

export const REQUEST_SOURCES = [
  'contact-form',
  'drafting-form',
  'contract-review-form',
  'business-services-form',
  'solution-finder',
  'whatsapp-agent',
  'catalog-order',
  'document-review',
];

// Sources set by the platform itself; public forms can't submit these
export const INTERNAL_REQUEST_SOURCES = ['whatsapp-agent', 'catalog-order', 'document-review'];
