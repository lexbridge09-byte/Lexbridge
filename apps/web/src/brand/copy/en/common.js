export const common = {
  brand: {
    metaTitle: 'LexBridge: legal help for everyday matters',
    metaDescription: 'Talk to a qualified legal professional by phone or video. Legal documents and contract checks with the fee shown upfront.',
    shortDescription: 'Legal help for individuals and businesses in India.',
    notLawFirmNotice: 'LexBridge is a legal-services platform, not a law firm. Content on this site is general information, not legal advice.',
    dashboardName: 'My LexBridge',
  },

  skipToContent: 'Skip to content',
  homeLinkLabel: 'LexBridge home',
  scrollTop: 'Back to top',

  nav: {
    mainLabel: 'Main',
    services: 'Services',
    servicesMenuLabel: 'Services menu',
    allServices: 'All services',
    talkToLawyer: 'Talk to a lawyer',
    documentReview: 'AI document review',
    help: 'Help',
    helpMenuLabel: 'Help menu',
    findSolution: 'Find my solution',
    insights: 'Legal guides',
    about: 'About',
    contact: 'Contact',
    faq: 'FAQ',
    megaTitle: 'Find help by situation',
    seeAll: 'See all',
    situations: {
      property: { label: 'Property & rent', description: 'Rent agreements, deeds, disputes' },
      money: { label: 'Money & notices', description: 'Cheque bounce, unpaid dues, notices' },
      consumer: { label: 'Consumer & fraud', description: 'Faulty products, refunds, online fraud' },
      family: { label: 'Family & personal', description: 'Wills, marriage, police matters' },
      business: { label: 'Business & trademark', description: 'Company, GST, trademark' },
    },
  },

  menu: {
    open: 'Open menu',
    close: 'Close menu',
  },

  language: {
    label: 'Language',
  },

  account: {
    signIn: 'Sign in',
  },

  cta: {
    consult: 'Book my consultation',
    consultNote: 'Phone or video · fee shown before you pay',
    contact: 'Contact us',
    contactNote: 'Tell us what you need.',
    describe: 'Check what I need (free)',
    exploreServices: 'Explore services',
    findSolution: 'Find my solution',
  },

  price: {
    from: (priceLabel) => `From ${priceLabel}`,
    inclGst: 'incl. GST',
    was: (priceLabel) => `Was ${priceLabel}`,
    feeShown: 'Fee shown before you pay',
  },

  tabs: {
    label: 'Quick navigation',
    home: 'Home',
    services: 'Services',
    consult: 'Consult',
    contact: 'Contact',
    cases: 'My cases',
    help: 'Help',
  },

  stickyBar: {
    label: 'Get legal help',
    title: 'Need legal help?',
  },

  promo: {
    text: '',
    linkLabel: '',
    href: '',
  },

  support: {
    call: (phone) => `Call ${phone}`,
    email: (email) => `Email ${email}`,
  },

  contactLinks: {
    email: 'Email',
    phone: 'Phone',
    whatsApp: 'WhatsApp',
    instagram: 'Instagram',
  },

  footer: {
    company: 'Company',
    services: 'Services',
    legal: 'Legal',
    connect: 'Connect',
    disclaimerLabel: 'Disclaimer',
    copyright: (year) => `© ${year} LexBridge`,
    companyDetails: {
      legalName: 'Registered name',
      cin: 'CIN',
      gstin: 'GSTIN',
      address: 'Address',
      grievanceOfficer: 'Grievance officer',
      supportHours: 'Support hours',
    },
  },

  states: {
    loading: 'Loading…',
    tryAgain: 'Try again',
    genericError: 'Something went wrong. Please try again.',
    networkError: 'Can’t reach LexBridge. Check your connection.',
    uploadNetworkError: 'Upload failed. Check your connection.',
    uploadFailed: 'Upload failed. Please try again.',
    tooManyRequests: 'Too many attempts. Please wait a few minutes.',
    signInAgain: 'Please sign in to continue.',
    noAccess: 'You don’t have access to this.',
    notFound: 'We couldn’t find that.',
    tooLarge: 'This file is larger than 10 MB.',
  },

  pagination: {
    label: 'Pagination',
    previous: 'Previous',
    next: 'Next',
    pageOf: (page, pageCount) => `Page ${page} of ${pageCount}`,
  },

  signOut: {
    idle: 'Sign out',
    busy: 'Signing out…',
  },

  timeZone: 'IST',

  notFound: {
    title: 'Page not found',
    body: 'The link may be old, or the page has moved.',
    home: 'Go home',
    services: 'Browse services',
  },

  error: {
    title: 'Something went wrong',
    body: 'Please try again.',
    retry: 'Try again',
    home: 'Go home',
  },
};
