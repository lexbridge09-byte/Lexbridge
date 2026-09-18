import { isFeatureEnabled } from '@lexbridge/shared';
import { formatRupees } from '@/lib/formatValues';
import { getDictionary } from './i18n.js';
import { deriveServiceHref, getProblemShortcuts, SERVICE_DISPLAY_ORDER } from './navigation.js';

export { deriveProblemHref, getProblemShortcuts } from './navigation.js';

/*
  Entries for the service search: problems, service areas and published products (server components only).
  English wording is added to the keywords so an English query also works on the Hindi site.
*/
export function buildSearchItems(dictionary, locale, products) {
  const english = getDictionary('en');
  const kinds = dictionary.ux.search.kinds;

  const problemItems = getProblemShortcuts(dictionary, products).map((problem) => ({
    id: `problem-${problem.id}`,
    kind: 'problem',
    title: problem.label,
    subtitle: kinds.problem,
    href: problem.href,
    keywords: [dictionary.ux.problems.items[problem.id].keywords, english.ux.problems.items[problem.id].label, english.ux.problems.items[problem.id].keywords].join(' '),
  }));

  const serviceItems = SERVICE_DISPLAY_ORDER.map((serviceKey) => {
    const service = dictionary.services.items[serviceKey];
    const englishService = english.services.items[serviceKey];
    return {
      id: `service-${serviceKey}`,
      kind: 'service',
      title: service.title,
      subtitle: kinds.service,
      href: deriveServiceHref(serviceKey),
      keywords: [service.intro, ...service.items, englishService.title, ...englishService.items].join(' '),
    };
  });

  const productItems = isFeatureEnabled('serviceCatalog')
    ? products.map((product) => ({
        id: `product-${product.Slug}`,
        kind: 'product',
        title: product.Title,
        subtitle: `${kinds.product} · ${formatRupees(product.PricePaise, locale)}`,
        href: `/services/${product.Slug}`,
        keywords: [product.Summary, dictionary.commerce.labels.productCategories[product.Category]?.label, english.commerce.labels.productCategories[product.Category]?.label]
          .filter(Boolean)
          .join(' '),
      }))
    : [];

  return [...productItems, ...serviceItems, ...problemItems];
}
