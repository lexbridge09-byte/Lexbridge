import { ArrowRight, Sparkles } from 'lucide-react';
import { BRAND, deriveServiceHref, getDictionary, getServerFeatures, SERVICE_DISPLAY_ORDER } from '@/brand';
import { buildSearchItems } from '@/brand/searchIndex';
import { ProductCatalog } from '@/components/commerce/productCatalog';
import { ServiceAreaGrid } from '@/components/serviceAreaGrid';
import { ServiceSearch } from '@/components/serviceSearch';
import { ButtonLink, Container, FaqAccordion, PageHero, Reveal, Section, SectionHeader } from '@/components/ui';
import { getIcon } from '@/lib/icons';
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
    <>
      <PageHero title={header.title} aside={<ServiceSearch items={buildSearchItems(dictionary, lang, products, features)} />} />

      <Container className="py-8 lg:py-10">
        {hasCatalogue ? (
          <ProductCatalog key={category ?? ''} products={products} initialCategory={typeof category === 'string' ? category : ''} />
        ) : (
          <ServiceAreaGrid
            copy={copy}
            serviceKeys={SERVICE_DISPLAY_ORDER}
            serviceHrefs={serviceHrefs}
            featuredFacts={BRAND.trustClaims.map((claim) => ({ key: claim.key, icon: getIcon(claim.icon), label: dictionary.home.hero.trust[claim.key] }))}
          />
        )}

        {features.solutionFinder && (
          <Reveal className="mt-8 flex flex-col gap-4 rounded-panel border border-dashed border-primary/35 bg-canvas-alt p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-bright ring-1 ring-primary/30">
                <Sparkles aria-hidden="true" className="size-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-h4 text-on-canvas">{copy.notSure}</p>
                <p className="mt-1 text-sm leading-6 text-on-canvas-muted">{copy.notSureBody}</p>
              </div>
            </div>
            <ButtonLink href="/find-my-solution" variant="onDarkBronze" className="group shrink-0">
              {copy.notSureLink}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-(--dur-150) group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2} />
            </ButtonLink>
          </Reveal>
        )}
      </Container>

      <Section tone="alt" labelledBy="services-faq-title">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <SectionHeader id="services-faq-title" title={copy.faq.title} />
          <Reveal>
            <FaqAccordion items={copy.faq.items} isFirstOpen={false} />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
