// Localised labels for values defined in @lexbridge/shared (keys must match the shared catalog)
export const catalog = {
  services: {
    'legal-consultation': { label: 'Legal consultation', summary: 'Understand your position and options.' },
    'legal-drafting': { label: 'Legal drafting', summary: 'Notices, agreements and affidavits.' },
    'contract-review': { label: 'Contract review', summary: 'Check a contract before you sign.' },
    'criminal-law': { label: 'Criminal law', summary: 'FIRs, complaints and bail guidance.' },
    'civil-property': { label: 'Civil and property', summary: 'Property disputes and money recovery.' },
    'consumer-matters': { label: 'Consumer matters', summary: 'Refunds, defects and poor service.' },
    'business-corporate': { label: 'Business and corporate', summary: 'Agreements and business paperwork.' },
    other: { label: 'Other', summary: 'Something else.' },
  },

  requestStatuses: {
    submitted: 'Submitted',
    'under-review': 'Under review',
    'in-progress': 'In progress',
    'awaiting-client': 'Waiting for you',
    completed: 'Completed',
    closed: 'Closed',
  },

  consultationTypes: {
    quick: { label: 'Quick consultation', summary: 'One focused question.' },
    detailed: { label: 'Detailed consultation', summary: 'More time for complex matters.' },
    document: { label: 'Document consultation', summary: 'Discuss a notice or agreement.' },
  },

  consultationModes: {
    phone: { label: 'Phone', summary: 'We call you.' },
    video: { label: 'Video', summary: 'Link shared before the call.' },
  },

  consultationStatuses: {
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    'no-show': 'Missed',
  },

  slotStatuses: {
    open: 'Open',
    booked: 'Booked',
    blocked: 'Blocked',
  },

  articleTopics: {
    'criminal-law': { label: 'Criminal law', summary: 'FIRs, bail and procedure.' },
    'civil-law': { label: 'Civil law', summary: 'Everyday disputes and remedies.' },
    'consumer-law': { label: 'Consumer law', summary: 'Your rights as a buyer.' },
    'property-law': { label: 'Property law', summary: 'Buying, renting and disputes.' },
    contracts: { label: 'Contracts', summary: 'What to check before signing.' },
    'business-law': { label: 'Business law', summary: 'Legal basics for businesses.' },
  },

  articleStatuses: {
    published: 'Published',
    draft: 'Draft',
  },

  roles: {
    admin: 'Admin',
    client: 'Client',
  },

  requestSources: {
    'contact-form': 'Contact form',
    'drafting-form': 'Drafting request',
    'contract-review-form': 'Contract review request',
    'business-services-form': 'Business request',
    'solution-finder': 'Find my solution',
    'whatsapp-agent': 'WhatsApp assistant',
    'catalog-order': 'Online order',
    'document-review': 'Document review',
  },

  whatsAppMessageKinds: {
    user: 'Question',
    assistant: 'Assistant reply',
    notice: 'Privacy notice',
    'payment-link': 'Payment link',
    handoff: 'Team handoff',
    system: 'Command or system message',
  },

  whatsAppCharges: {
    free: 'Free question',
    paid: 'Paid question',
    refunded: 'Not counted',
  },

  whatsAppPaymentStatuses: {
    created: 'Awaiting payment',
    paid: 'Paid',
    expired: 'Expired',
    cancelled: 'Cancelled',
  },
};
