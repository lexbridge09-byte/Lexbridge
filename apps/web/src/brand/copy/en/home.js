export const home = {
  hero: {
    title: 'Get clear legal help today',
    subtitle: 'Talk to a qualified legal professional by phone or video. See the fee before you pay.',
    trustLabel: 'Why LexBridge',
    trust: {
      qualified: 'Qualified professionals',
      confidential: 'Private & secure',
      fee: 'Fee shown before you pay',
    },
    priceFrom: (priceLabel) => `Fixed-price services from ${priceLabel}`,
    // Decorative product preview; not a real client or case
    mockup: {
      title: 'Your matter',
      category: 'Property dispute',
      status: 'In progress',
      steps: ['Concern received', 'Service matched', 'Consultation booked'],
      nextLabel: 'Next step',
      nextValue: 'Video call',
      documentsLabel: 'Documents',
      documentsValue: 'Shared securely',
      assignedLabel: 'Professional assigned',
    },
  },

  situations: {
    title: 'Find help by situation',
    description: 'Pick what’s closest. We’ll guide you from there.',
  },

  products: {
    title: 'Popular fixed-price services',
    description: 'Price and timeline shown upfront.',
    viewAll: 'See all services',
  },

  steps: {
    title: 'How it works',
    description: 'Three steps. No legal jargon.',
    items: [
      { title: 'Tell us what happened', description: 'In your own words. Takes about 2 minutes.' },
      { title: 'See the right service and fee', description: 'We suggest what fits. You see the fee first.' },
      { title: 'Talk to a professional', description: 'By phone or video. Track every update online.' },
    ],
    value: {
      title: 'One form. One call. Every update online.',
      description: 'No hidden charges. Cancel up to 2 hours before your call.',
      cta: 'Start now',
    },
  },

  aiReview: {
    pill: 'AI document review',
    title: 'Check a document before you sign',
    description: 'Upload an agreement or notice as a PDF. Get a plain summary and the points to check.',
    points: ['Plain-language summary', 'Clauses worth a second look', 'Lawyer review if you need it'],
    cta: 'Check my document',
    note: 'General information, not legal advice.',
    mockup: {
      fileName: 'rent-agreement.pdf',
      status: 'Summary ready',
      rows: ['Rent and deposit terms found', 'Notice period: 1 month', 'Lock-in clause needs a look'],
      riskLabel: 'Worth a closer look',
    },
  },

  trust: {
    title: 'Why people choose LexBridge',
    items: [
      { icon: 'qualified', title: 'Qualified professionals', description: 'Your matter goes to a professional who handles this kind of case.' },
      { icon: 'confidential', title: 'Private and secure', description: 'Your details and files are used only for your matter.' },
      { icon: 'fee', title: 'Fee before you pay', description: 'You see the fee first. No hidden charges.' },
      { icon: 'refund', title: 'Clear refund policy', description: 'Know what happens if your plans change.' },
    ],
    refundLink: 'Read the refund policy',
    contactTitle: 'Prefer to talk first?',
    contactBody: 'Ask for a call back and we’ll ring you.',
  },

  guides: {
    title: 'Legal guides',
    description: 'Plain answers to common legal questions.',
    viewAll: 'All guides',
  },

  stats: {
    label: 'LexBridge in numbers',
    requestsResolved: 'Requests resolved',
    consultationsCompleted: 'Consultations completed',
    documentsReviewed: 'Documents reviewed',
  },

  testimonials: {
    title: 'What clients say',
  },

  faq: {
    title: 'Common questions',
    viewAll: 'View all questions',
  },
};
