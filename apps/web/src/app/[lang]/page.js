import {
  BRAND,
  getDictionary,
  getFaqItems,
  getPrimaryCta,
  getProblemShortcuts,
  getSecondaryCta,
  getSituationGroups,
  isFeatureEnabled,
} from '@/brand';
import { buildSearchItems } from '@/brand/searchIndex';
import { ProductCard } from '@/components/commerce/productCard';
import { AiReviewPanel } from '@/components/home/aiReviewPanel';
import { GuidesList } from '@/components/home/guidesList';
import { HowItWorks } from '@/components/home/howItWorks';
import { ProblemShortcuts } from '@/components/home/problemShortcuts';
import { RequestPreview } from '@/components/home/requestPreview';
import { SituationTiles } from '@/components/home/situationTiles';
import { TrustBlock } from '@/components/home/trustBlock';
import { ServiceSearch } from '@/components/serviceSearch';
import { ButtonLink, Container, FaqAccordion, Section, SectionHeader, StatsStrip, TestimonialCarousel } from '@/components/ui';
import { getIcon } from '@/lib/icons';
import { loadPublishedProducts } from '@/lib/publicProducts';
import { loadPublicStats } from '@/lib/publicStats';
import { loadPublicApi } from '@/lib/serverApi';

async function loadLatestGuides() {
  if (!isFeatureEnabled('legalInsights')) return [];
  const { data } = await loadPublicApi('/articles');
  return (data?.articles ?? []).slice(0, BRAND.homeGuideLimit);
}

export default async function HomePage({ params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const home = dictionary.home;
  const primaryCta = getPrimaryCta(dictionary);
  const secondaryCta = getSecondaryCta(dictionary);

  // Independent loads run together; each one hides its section when it fails
  const [stats, products, guides] = await Promise.all([
    loadPublicStats(dictionary, lang),
    isFeatureEnabled('serviceCatalog') ? loadPublishedProducts() : [],
    loadLatestGuides(),
  ]);
  const featuredProducts = products.slice(0, BRAND.homeProductLimit);
  const faqItems = getFaqItems(dictionary, lang, { limit: BRAND.homeFaqLimit });

  return (
    <>
      {/* Hero: the headline, subhead and primary action render immediately (no entrance animation) */}
      <section className="relative isolate bg-hero text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 overflow-hidden bg-grid-lines [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]"
        />
        <Container className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-16">
          <div>
            <ul aria-label={home.hero.trustLabel} className="flex flex-wrap gap-x-5 gap-y-2">
              {BRAND.trustClaims.map((claim) => {
                const Icon = getIcon(claim.icon);
                return (
                  <li key={claim.key} className="flex items-center gap-2 text-xs font-medium text-white/90 sm:text-sm">
                    <Icon aria-hidden="true" className="size-4 text-accent" strokeWidth={2} />
                    {home.hero.trust[claim.key]}
                  </li>
                );
              })}
            </ul>
            <h1 className="mt-5 text-h1">{home.hero.title}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/85 lg:text-lg lg:leading-8">{home.hero.subtitle}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={primaryCta.href} variant="onDark" size="lg" className="sm:min-w-56">
                {primaryCta.label}
              </ButtonLink>
              <ButtonLink href={secondaryCta.href} variant="ghostOnDark" size="lg" className="sm:min-w-56">
                {secondaryCta.label}
              </ButtonLink>
            </div>
            <p className="mt-3 text-sm text-white/75">{primaryCta.note}</p>
            <ServiceSearch items={buildSearchItems(dictionary, lang, products)} className="mt-6 max-w-xl" />
          </div>
          <RequestPreview mockup={home.hero.mockup} />
        </Container>
      </section>

      <ProblemShortcuts title={dictionary.ux.problems.title} problems={getProblemShortcuts(dictionary, products)} />

      <SituationTiles
        title={home.situations.title}
        description={home.situations.description}
        groups={getSituationGroups(dictionary, products)}
        allServicesLabel={dictionary.common.nav.allServices}
        priceFrom={dictionary.common.price.from}
        locale={lang}
      />

      {featuredProducts.length > 0 && (
        <Section labelledBy="products-title">
          <SectionHeader
            id="products-title"
            title={home.products.title}
            description={home.products.description}
            action={
              <ButtonLink href="/services" variant="link">
                {home.products.viewAll}
              </ButtonLink>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <li key={product._id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <HowItWorks copy={home.steps} />

      {isFeatureEnabled('aiDocumentReview') && <AiReviewPanel copy={home.aiReview} href="/document-review" />}

      <TrustBlock copy={home.trust} contactLabel={dictionary.common.cta.contact} />

      {guides.length > 0 && <GuidesList copy={home.guides} guides={guides} />}

      <StatsStrip label={home.stats.label} stats={stats} />

      <TestimonialCarousel title={home.testimonials.title} items={BRAND.testimonials} />

      <Section labelledBy="faq-title" size="sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <h2 id="faq-title" className="text-section text-ink">
              {home.faq.title}
            </h2>
            <ButtonLink href="/faq" variant="link" className="mt-2">
              {home.faq.viewAll}
            </ButtonLink>
          </div>
          <FaqAccordion items={faqItems} />
        </div>
      </Section>
    </>
  );
}
