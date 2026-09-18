import { deriveServiceHref, getDictionary, isFeatureEnabled, SERVICE_DISPLAY_ORDER } from '@/brand';
import { buildSearchItems } from '@/brand/searchIndex';
import { ProductCatalog } from '@/components/commerce/productCatalog';
import { TrustBlock } from '@/components/home/trustBlock';
import { ServiceAreaTabs } from '@/components/serviceAreaTabs';
import { ServiceSearch } from '@/components/serviceSearch';
import { ButtonLink, FaqAccordion, PageHeader, ProcessSteps, Section, SectionHeader } from '@/components/ui';
import { loadPublishedProducts } from '@/lib/publicProducts';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  return isFeatureEnabled('serviceCatalog') ? dictionary.commerce.catalogue.metadata : dictionary.services.metadata;
}

export default async function ServicesPage({ params, searchParams }) {
  const { lang } = await params;
  const { category } = await searchParams;
  const dictionary = getDictionary(lang);
  const copy = dictionary.services;
  const products = isFeatureEnabled('serviceCatalog') ? await loadPublishedProducts() : [];
  const hasCatalogue = products.length > 0;
  const header = hasCatalogue ? dictionary.commerce.catalogue.header : copy.header;
  const serviceHrefs = Object.fromEntries(SERVICE_DISPLAY_ORDER.map((serviceKey) => [serviceKey, deriveServiceHref(serviceKey)]));

  return (
    <>
      <PageHeader title={header.title} lead={header.lead} />

      {/* Primary action above the fold: search, then products (or service areas until products are published) */}
      <Section tone="alt" size="sm">
        <ServiceSearch items={buildSearchItems(dictionary, lang, products)} className="mb-5 max-w-xl" />
        {hasCatalogue ? (
          <ProductCatalog key={category ?? ''} products={products} initialCategory={typeof category === 'string' ? category : ''} />
        ) : (
          <ServiceAreaTabs serviceKeys={SERVICE_DISPLAY_ORDER} serviceHrefs={serviceHrefs} />
        )}
        {isFeatureEnabled('solutionFinder') && (
          <p className="mt-6 text-center text-sm text-ink-muted">
            {copy.notSure}{' '}
            <ButtonLink href="/find-my-solution" variant="link" className="font-semibold">
              {copy.notSureLink}
            </ButtonLink>
          </p>
        )}
      </Section>

      <Section labelledBy="services-steps-title">
        <SectionHeader id="services-steps-title" title={copy.steps.title} />
        <ProcessSteps steps={copy.steps.items} />
      </Section>

      <TrustBlock copy={dictionary.home.trust} contactLabel={dictionary.common.cta.contact} />

      <Section tone="alt" labelledBy="services-faq-title" size="sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <h2 id="services-faq-title" className="text-section text-ink">
              {copy.faq.title}
            </h2>
            <ButtonLink href="/faq" variant="link" className="mt-2">
              {dictionary.home.faq.viewAll}
            </ButtonLink>
          </div>
          <FaqAccordion items={copy.faq.items} />
        </div>
      </Section>
    </>
  );
}
