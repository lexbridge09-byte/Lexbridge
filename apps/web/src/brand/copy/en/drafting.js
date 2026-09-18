export const drafting = {
  metadata: {
    title: 'Legal drafting',
    description: 'Legal notices, agreements, affidavits, applications and complaints.',
  },
  header: {
    title: 'Legal drafting',
    lead: 'Get legal documents drafted for your situation.',
  },

  documentTypes: {
    title: 'Documents we draft',
    items: [
      { icon: 'notice', title: 'Legal notices', description: 'A formal demand or reply.' },
      { icon: 'agreement', title: 'Agreements', description: 'Rights and duties between parties.' },
      { icon: 'affidavit', title: 'Affidavits', description: 'Sworn statements and declarations.' },
      { icon: 'application', title: 'Applications', description: 'Formal letters to authorities.' },
      { icon: 'complaint', title: 'Complaints', description: 'Clear, structured complaints.' },
      { icon: 'other', title: 'Other documents', description: 'Tell us what you need.' },
    ],
  },

  steps: {
    title: "How it works",
    items: [
      { title: "Share details", description: "Tell us what the document needs." },
      { title: "Scope and fee", description: "We confirm both before starting." },
      { title: "Drafting and changes", description: "We prepare it. Ask for changes if needed." },
      { title: "Delivery", description: "Receive the final document." },
    ],
  },

  request: {
    title: 'Request a document',
    note: 'Scope and fee confirmed before we start.',
    subtypeLabel: 'Document type',
    descriptionLabel: 'What should it cover?',
    submitLabel: 'Request document',
  },
};
