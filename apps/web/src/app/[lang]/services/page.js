import { deriveServiceHref, getDictionary, getServerFeatures, SERVICE_DISPLAY_ORDER } from '@/brand';
import { buildSearchItems } from '@/brand/searchIndex';
import { ProductCatalog } from '@/components/commerce/productCatalog';
import { ServiceAreaTabs } from '@/components/serviceAreaTabs';
import { ServiceSearch } from '@/components/serviceSearch';
import { ButtonLink, FaqAccordion, TaskHelp, TaskPage } from '@/components/ui';
import { loadPublishedProducts } from '@/lib/publicProducts';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  return features.serviceCatalog ? dictionary.commerce.catalogue.metadata : dictionary.services.metadata;
}

export default async function ServicesPage({ params, searchParams }) {
  const { lang } = await params;
  const { category } = await searchParams;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const copy = dictionary.services;
  const products = features.serviceCatalog ? await loadPublishedProducts() : [];
  const hasCatalogue = products.length > 0;
  const header = hasCatalogue ? dictionary.commerce.catalogue.header : copy.header;
  const serviceHrefs = Object.fromEntries(SERVICE_DISPLAY_ORDER.map((key) => [key, deriveServiceHref(key, features)]));

  return (
    <TaskPage title={header.title} lead={header.lead} isWide>
      <ServiceSearch items={buildSearchItems(dictionary, lang, products, features)} className="mb-5 max-w-xl" />
      {hasCatalogue ? (
        <ProductCatalog key={category ?? ''} products={products} initialCategory={typeof category === 'string' ? category : ''} />
      ) : (
        <ServiceAreaTabs serviceKeys={SERVICE_DISPLAY_ORDER} serviceHrefs={serviceHrefs} />
      )}
      {features.solutionFinder && (
        <p className="mt-5 text-sm text-on-canvas-muted">
          {copy.notSure}{' '}
          <ButtonLink href="/find-my-solution" variant="linkOnDark">{copy.notSureLink}</ButtonLink>
        </p>
      )}
      <TaskHelp title={copy.faq.title}><FaqAccordion items={copy.faq.items} isFirstOpen={false} /></TaskHelp>
    </TaskPage>
  );
}
