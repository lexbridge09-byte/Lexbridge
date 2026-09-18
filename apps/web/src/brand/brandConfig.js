// Language-neutral brand settings. All wording lives in brand/copy/<locale>/.
export const BRAND = Object.freeze({
  name: 'LexBridge',

  // Hero promises; labels come from home.hero.trust[key]. Each must be true of how LexBridge works.
  trustClaims: Object.freeze([
    Object.freeze({ key: 'qualified', icon: 'qualified' }),
    Object.freeze({ key: 'confidential', icon: 'confidential' }),
    Object.freeze({ key: 'fee', icon: 'fee' }),
  ]),

  // Set to true only once catalogue prices are confirmed to include GST; the "incl. GST" label follows it
  pricesIncludeGst: false,

  // Legal entity details for the footer. Empty values are hidden. The owner must fill these before launch.
  company: Object.freeze({
    legalName: '',
    cin: '',
    gstin: '',
    address: '',
    grievanceOfficer: Object.freeze({ name: '', email: '' }),
    supportHours: '',
  }),

  // Real, consented client quotes only: { quote, name, city }. The section stays hidden while empty.
  testimonials: Object.freeze([]),

  // Real press coverage only: { outlet, href }. Hidden while empty.
  pressMentions: Object.freeze([]),

  // A public figure from GET /api/stats/public is shown only once it reaches this number
  publicStatsMinimum: 25,

  // Home page shows at most this many FAQ entries and guides
  homeFaqLimit: 5,
  homeGuideLimit: 3,
  homeProductLimit: 6,

  /*
    Problem tiles; wording in ux.problems.items[id]. Each opens its product when that product is published,
    otherwise the solution finder with the problem prefilled.
  */
  problemShortcuts: Object.freeze([
    Object.freeze({ id: 'cheque-bounce', icon: 'cheque', productSlug: 'legal-notice-drafting' }),
    Object.freeze({ id: 'legal-notice', icon: 'notice', productSlug: 'legal-notice-drafting' }),
    Object.freeze({ id: 'rent-agreement', icon: 'agreement', productSlug: 'rent-agreement-drafting' }),
    Object.freeze({ id: 'family-matter', icon: 'family', productSlug: '' }),
    Object.freeze({ id: 'property-dispute', icon: 'property', productSlug: '' }),
    Object.freeze({ id: 'consumer-complaint', icon: 'consumer', productSlug: 'consumer-complaint-drafting' }),
    Object.freeze({ id: 'police-case', icon: 'police', productSlug: '' }),
    Object.freeze({ id: 'online-fraud', icon: 'fraud', productSlug: '' }),
    Object.freeze({ id: 'salary-unpaid', icon: 'salary', productSlug: 'legal-notice-drafting' }),
  ]),

  /*
    Life situations for the Services mega menu and the home "find help by situation" tiles.
    Wording in common.nav.situations[key]. Published products are listed first, then problems.
  */
  situations: Object.freeze([
    Object.freeze({
      key: 'property',
      icon: 'property',
      categoryKey: 'property',
      serviceKey: 'civil-property',
      productSlugs: Object.freeze(['rent-agreement-drafting', 'sale-deed-drafting', 'property-verification-report']),
      problemIds: Object.freeze(['rent-agreement', 'property-dispute']),
    }),
    Object.freeze({
      key: 'money',
      icon: 'cheque',
      categoryKey: 'documents',
      serviceKey: 'legal-drafting',
      productSlugs: Object.freeze(['legal-notice-drafting', 'contract-review']),
      problemIds: Object.freeze(['cheque-bounce', 'salary-unpaid', 'legal-notice']),
    }),
    Object.freeze({
      key: 'consumer',
      icon: 'consumer',
      categoryKey: 'personal',
      serviceKey: 'consumer-matters',
      productSlugs: Object.freeze(['consumer-complaint-drafting']),
      problemIds: Object.freeze(['consumer-complaint', 'online-fraud']),
    }),
    Object.freeze({
      key: 'family',
      icon: 'family',
      categoryKey: 'personal',
      serviceKey: 'legal-consultation',
      productSlugs: Object.freeze(['will-drafting']),
      problemIds: Object.freeze(['family-matter', 'police-case']),
    }),
    Object.freeze({
      key: 'business',
      icon: 'business',
      categoryKey: 'business',
      serviceKey: 'business-corporate',
      productSlugs: Object.freeze(['private-limited-company-registration', 'gst-registration', 'trademark-filing']),
      problemIds: Object.freeze([]),
    }),
  ]),

  // Matches the API default DOCUMENT_REVIEW_FILE_RETENTION_DAYS; keep in step if the server value changes
  documentReviewRetentionDays: 7,
});
