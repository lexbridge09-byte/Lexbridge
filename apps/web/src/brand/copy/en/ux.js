// Problem tiles, search, account menu, progress steps and booking summary
export const ux = {
  problems: {
    title: 'What do you need help with?',
    items: {
      'cheque-bounce': {
        label: 'Cheque bounced?',
        concern: 'A cheque given to me bounced and I want my money back.',
        keywords: 'cheque bounce section 138 payment recovery',
      },
      'legal-notice': {
        label: 'Got a legal notice?',
        concern: 'I received a legal notice and need help replying.',
        keywords: 'notice reply letter lawyer',
      },
      'rent-agreement': {
        label: 'Renting a flat?',
        concern: 'I need a rent agreement for a flat or house.',
        keywords: 'rent agreement lease tenant landlord',
      },
      'family-matter': {
        label: 'Marriage or family issue?',
        concern: 'I need advice on a marriage or family matter.',
        keywords: 'divorce marriage custody maintenance family',
      },
      'property-dispute': {
        label: 'Land or flat dispute?',
        concern: 'I have a dispute about land or a flat.',
        keywords: 'property land house flat possession encroachment',
      },
      'consumer-complaint': {
        label: 'Cheated by a seller?',
        concern: 'A seller or company sold me a faulty product or service and won’t fix it.',
        keywords: 'consumer refund defective complaint seller',
      },
      'police-case': {
        label: 'Police case or FIR?',
        concern: 'I need help with a police case or FIR.',
        keywords: 'police fir bail criminal complaint',
      },
      'online-fraud': {
        label: 'Lost money online?',
        concern: 'I lost money to an online fraud or scam.',
        keywords: 'online fraud scam cyber upi money',
      },
      'salary-unpaid': {
        label: 'Salary not paid?',
        concern: 'My employer has not paid my salary or dues.',
        keywords: 'salary dues employer unpaid wages',
      },
    },
  },

  search: {
    label: 'Search legal services',
    placeholder: 'Try “rent agreement” or “notice”',
    suggestions: 'Popular',
    results: (count) => `${count} ${count === 1 ? 'result' : 'results'}`,
    describe: (query) => `Describe “${query}” to find help`,
    kinds: {
      problem: 'Common problem',
      service: 'Service',
      product: 'Fixed price',
    },
  },

  account: {
    menuLabel: 'Account menu',
    dashboard: 'Dashboard',
    orders: 'Orders',
    documents: 'Documents',
    documentReviews: 'Document reviews',
    admin: 'Admin',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
  },

  steps: {
    label: 'Progress',
    checkout: ['Details', 'Pay', 'Done'],
    booking: ["Consultation", "Date & time", "Details"],
  },

  checkoutTrust: {
    secure: 'Secure payment via Razorpay',
    refundPolicy: 'Refund policy',
  },

  bookingSummary: {
    title: 'Your booking',
    type: 'Type',
    mode: 'Mode',
    when: 'Date & time',
    notSelected: 'Not chosen',
    fee: 'Fee',
    feeValue: 'Confirmed before your call',
    faqLink: 'Questions? See FAQ',
  },
};
