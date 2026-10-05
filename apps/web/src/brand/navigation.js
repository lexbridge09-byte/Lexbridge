import { PRODUCT_CATEGORY_KEYS } from '@lexbridge/shared';
import { BRAND } from './brandConfig.js';

/*
  All site navigation is built here from a dictionary. Features are passed in by the caller
  (runtime switches from the API on the server, FeaturesProvider on the client), so a kill-switch
  updates every menu, tab and link at once. Hrefs are locale-free ("/services"); LocaleLink adds
  the locale when rendering. Client-safe: no dictionary imports.
*/

function keepEnabled(items) {
  return items.filter((item) => item && (!item.feature || item.features?.[item.feature]));
}

// Order used on the services page and in menus
export const SERVICE_DISPLAY_ORDER = [
  'legal-consultation',
  'legal-drafting',
  'contract-review',
  'civil-property',
  'consumer-matters',
  'business-corporate',
  'criminal-law',
];

const SERVICE_PAGES = {
  'legal-consultation': { href: '/consultation', feature: 'consultationBooking' },
  'legal-drafting': { href: '/drafting', feature: 'legalDrafting' },
};

// Where to send someone for a service key from @lexbridge/shared; disabled pages fall back to the contact form
export function deriveServiceHref(serviceKey, features = {}) {
  const servicePage = SERVICE_PAGES[serviceKey];
  return servicePage && features[servicePage.feature] ? servicePage.href : `/contact?service=${serviceKey}`;
}

// A problem opens its product when that product is published, otherwise the finder with the problem prefilled
export function deriveProblemHref(shortcut, dictionary, publishedSlugs, features) {
  if (shortcut.productSlug && features?.serviceCatalog && publishedSlugs.has(shortcut.productSlug)) {
    return `/services/${shortcut.productSlug}`;
  }
  if (features?.solutionFinder) {
    return `/find-my-solution?concern=${encodeURIComponent(dictionary.ux.problems.items[shortcut.id].concern)}`;
  }
  return '/contact';
}

export function getProblemShortcuts(dictionary, products = [], features = {}) {
  const publishedSlugs = new Set(products.map((product) => product.Slug));
  return BRAND.problemShortcuts.map((shortcut) => ({
    id: shortcut.id,
    icon: shortcut.icon,
    label: dictionary.ux.problems.items[shortcut.id].label,
    href: deriveProblemHref(shortcut, dictionary, publishedSlugs, features),
  }));
}

const SITUATION_LINK_LIMIT = 4;

// Life-situation groups for the mega menu and home tiles: published products (with prices) first, then problems
export function getSituationGroups(dictionary, products = [], features = {}) {
  const productsBySlug = new Map(products.map((product) => [product.Slug, product]));
  const publishedSlugs = new Set(productsBySlug.keys());
  const isCatalogueOn = Boolean(features.serviceCatalog);

  return BRAND.situations.map((situation) => {
    const productLinks = isCatalogueOn
      ? situation.productSlugs
          .map((slug) => productsBySlug.get(slug))
          .filter(Boolean)
          .map((product) => ({ key: `product-${product.Slug}`, href: `/services/${product.Slug}`, label: product.Title, pricePaise: product.PricePaise }))
      : [];
    const problemLinks = situation.problemIds.map((problemId) => ({
      key: `problem-${problemId}`,
      href: deriveProblemHref(
        BRAND.problemShortcuts.find((shortcut) => shortcut.id === problemId),
        dictionary,
        publishedSlugs,
        features,
      ),
      label: dictionary.ux.problems.items[problemId].label,
    }));
    const copy = dictionary.common.nav.situations[situation.key];
    return {
      key: situation.key,
      icon: situation.icon,
      label: copy.label,
      description: copy.description,
      href: isCatalogueOn && productLinks.length > 0 ? `/services?category=${situation.categoryKey}` : deriveServiceHref(situation.serviceKey, features),
      links: [...productLinks, ...problemLinks].slice(0, SITUATION_LINK_LIMIT),
    };
  });
}

// Service menu entries for the footer: catalogue categories when the catalogue is on, otherwise service areas
export function getServiceMenuItems(dictionary, features = {}, limit = SERVICE_DISPLAY_ORDER.length) {
  if (features.serviceCatalog) {
    return PRODUCT_CATEGORY_KEYS.slice(0, limit).map((categoryKey) => ({
      key: categoryKey,
      href: `/services?category=${categoryKey}`,
      label: dictionary.commerce.labels.productCategories[categoryKey].label,
    }));
  }
  return SERVICE_DISPLAY_ORDER.slice(0, limit).map((serviceKey) => ({
    key: serviceKey,
    href: `/services#${serviceKey}`,
    label: dictionary.services.items[serviceKey].title,
  }));
}

// The single most important action on the site
export function getPrimaryCta(dictionary, features = {}) {
  const cta = dictionary.common.cta;
  return features.consultationBooking
    ? { href: '/consultation', label: cta.consult, note: cta.consultNote }
    : { href: '/contact', label: cta.contact, note: cta.contactNote };
}

export function getSecondaryCta(dictionary, features = {}) {
  const cta = dictionary.common.cta;
  return features.solutionFinder
    ? { href: '/find-my-solution', label: cta.describe }
    : { href: '/services', label: cta.exploreServices };
}

// Intent-based, four items (Hick's law): Services (mega menu) · Talk to a lawyer · AI document review · Help
export function getPrimaryNav(dictionary, products = [], features = {}) {
  const nav = dictionary.common.nav;
  const isBookingEnabled = Boolean(features.consultationBooking);
  return keepEnabled([
    { key: 'services', href: '/services', label: nav.services, mega: getSituationGroups(dictionary, products, features), features },
    { key: 'lawyer', href: isBookingEnabled ? '/consultation' : '/contact', label: nav.talkToLawyer, features },
    { key: 'review', href: '/document-review', label: nav.documentReview, feature: 'aiDocumentReview', features },
    {
      key: 'help',
      href: '/faq',
      label: nav.help,
      features,
      children: keepEnabled([
        { key: 'finder', href: '/find-my-solution', label: nav.findSolution, feature: 'solutionFinder', features },
        { key: 'faq', href: '/faq', label: nav.faq, features },
        { key: 'insights', href: '/insights', label: nav.insights, feature: 'legalInsights', features },
        { key: 'bareActs', href: '/bare-acts', label: nav.bareActs, features },
        { key: 'about', href: '/about', label: nav.about, features },
        { key: 'contact', href: '/contact', label: nav.contact, features },
      ]),
    },
  ]);
}

// /dashboard sends signed-out visitors to sign in first
export function getAccountLink(dictionary, features = {}) {
  return features.clientAccounts ? { href: '/dashboard', label: dictionary.common.account.signIn } : null;
}

// Home · Services · Consult · My cases · Help
export function getMobileTabs(dictionary, features = {}) {
  const tabs = dictionary.common.tabs;
  const isBookingEnabled = Boolean(features.consultationBooking);
  return keepEnabled([
    { key: 'home', href: '/', label: tabs.home, icon: 'home', isExact: true, features },
    { key: 'services', href: '/services', label: tabs.services, icon: 'services', features },
    {
      key: 'consult',
      href: isBookingEnabled ? '/consultation' : '/contact',
      label: isBookingEnabled ? tabs.consult : tabs.contact,
      icon: 'consult',
      features,
    },
    { key: 'cases', href: '/dashboard', label: tabs.cases, icon: 'cases', feature: 'clientAccounts', features },
    { key: 'help', href: '/faq', label: tabs.help, icon: 'help', features },
  ]);
}

export function getLegalLinks(dictionary) {
  return Object.entries(dictionary.legal.pages).map(([slug, legalPage]) => ({ href: `/legal/${slug}`, label: legalPage.title }));
}

export function getFooterGroups(dictionary, features = {}) {
  const nav = dictionary.common.nav;
  const footer = dictionary.common.footer;
  return [
    {
      key: 'services',
      title: footer.services,
      links: keepEnabled([
        ...BRAND.situations.map((situation) => ({ href: deriveServiceHref(situation.serviceKey, features), label: nav.situations[situation.key].label, features })),
        { href: '/document-review', label: nav.documentReview, feature: 'aiDocumentReview', features },
        { href: '/services', label: nav.allServices, features },
      ]),
    },
    {
      key: 'company',
      title: footer.company,
      links: keepEnabled([
        { href: '/about', label: nav.about, features },
        { href: '/insights', label: nav.insights, feature: 'legalInsights', features },
        { href: '/bare-acts', label: nav.bareActs, features },
        { href: '/faq', label: nav.faq, features },
        { href: '/contact', label: nav.contact, features },
      ]),
    },
    { key: 'legal', title: footer.legal, links: getLegalLinks(dictionary) },
  ];
}
