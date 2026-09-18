// Keyed by the service keys in @lexbridge/shared SERVICE_CATALOG
export const services = {
  metadata: {
    title: 'Legal services',
    description: 'Consultation, drafting, contract review, property, consumer, business and criminal-law help.',
  },
  header: {
    title: 'Legal services',
    lead: 'Pick the area closest to your matter.',
  },
  tabsLabel: 'Legal services',
  notSure: 'Not sure which fits?',
  notSureLink: 'Describe your problem',

  items: {
    'legal-consultation': {
      title: 'Legal consultation',
      intro: 'Understand your legal position and next steps.',
      listLabel: 'Covers',
      items: ['General legal questions', 'First assessment of your matter', 'Document discussion', 'Procedural guidance', 'Your legal options'],
      ctaLabel: 'Book consultation',
    },
    'legal-drafting': {
      title: 'Legal drafting',
      intro: 'Notices, agreements and affidavits drafted for you.',
      listLabel: 'We draft',
      items: ['Legal notices', 'Agreements', 'Affidavits', 'Applications', 'Complaints', 'Declarations'],
      ctaLabel: 'Request drafting',
    },
    'contract-review': {
      title: 'Contract review',
      intro: 'Spot risks in a contract before you sign.',
      listLabel: 'We review',
      items: ['Employment agreements', 'Service agreements', 'Rental agreements', 'NDAs', 'Vendor agreements', 'Business contracts'],
      ctaLabel: 'Get a review',
    },
    'civil-property': {
      title: 'Civil and property',
      intro: 'Property disputes, money recovery and civil matters.',
      listLabel: 'Covers',
      items: ['Property disputes', 'Money recovery', 'Civil disputes', 'Notices', 'Agreements'],
      ctaLabel: 'Get help',
    },
    'consumer-matters': {
      title: 'Consumer matters',
      intro: 'Refunds, defective products and poor service.',
      listLabel: 'Covers',
      items: ['Defective products', 'Poor service', 'Refund disputes', 'Consumer complaints', 'Legal notices'],
      ctaLabel: 'Raise an issue',
    },
    'business-corporate': {
      title: 'Business and corporate',
      intro: 'Agreements, NDAs and paperwork for your business.',
      listLabel: 'Covers',
      items: ['Business agreements', 'NDAs', 'Employment documents', 'Vendor agreements', 'Legal notices'],
      ctaLabel: 'Get help',
    },
    'criminal-law': {
      title: 'Criminal law',
      intro: 'FIRs, complaints and bail-related guidance.',
      listLabel: 'Covers',
      items: ['FIR-related matters', 'Bail-related help', 'Criminal complaints', 'Criminal procedure'],
      ctaLabel: 'Get help',
    },
  },
  steps: {
    title: "How it works",
    items: [
      { title: "Pick a service", description: "Choose the help that fits, or describe your problem." },
      { title: "Pay the fixed fee", description: "The price is shown before you pay. Secure payment." },
      { title: "Share details", description: "Answer a few questions and upload documents." },
      { title: "Get it done", description: "A professional handles it. Track progress in your account." },
    ],
  },
  faq: {
    title: "Questions about services",
    items: [
      { id: "choose-service", question: "Which service should I choose?", answer: "Pick the closest match. If unsure, describe your problem and we suggest the right service." },
      { id: "final-prices", question: "Are the prices final?", answer: "Yes, for the scope described on the service. If extra work is needed, we tell you the cost before starting." },
      { id: "who-works", question: "Who works on my matter?", answer: "Our in-house legal team. Your details are shared only with the professional handling it." },
      { id: "how-long", question: "How long does it take?", answer: "Timelines are shown on each service. Most documents are delivered within a few working days." },
    ],
  },
};
