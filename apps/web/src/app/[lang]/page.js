import {
  BRAND,
  getDictionary,
  getFaqItems,
  getPrimaryCta,
  getProblemShortcuts,
  getSecondaryCta,
  getSituationGroups,
  getServerFeatures,
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

async function loadLatestGuides(features) {
  if (!features.legalInsights) return [];
  const { data } = await loadPublicApi('/articles');
  return (data?.articles ?? []).slice(0, BRAND.homeGuideLimit);
}

export default async function HomePage({ params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const home = dictionary.home;
  const features = await getServerFeatures();
  const primaryCta = getPrimaryCta(dictionary, features);
  const secondaryCta = getSecondaryCta(dictionary, features);

  // Independent loads run together; each one hides its section when it fails
  const [stats, products, guides] = await Promise.all([
    loadPublicStats(dictionary, lang),
    features.serviceCatalog ? loadPublishedProducts() : [],
    loadLatestGuides(features),
  ]);
  const featuredProducts = products.slice(0, BRAND.homeProductLimit);
  const faqItems = getFaqItems(dictionary, lang, features, { limit: BRAND.homeFaqLimit });

  return (
    <>
      {/* Hero: headline, subhead and primary action render immediately (no entrance animation).
          Only the decorative background is clipped — the search dropdown must overflow freely. */}
      <section className="relative isolate bg-hero text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-grid-lines [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]" />
          <div className="absolute -top-40 left-[18%] size-[34rem] rounded-full bg-primary/15 blur-[130px]" />
          <div className="absolute -right-24 bottom-10 size-[26rem] rounded-full bg-primary-bright/10 blur-[110px]" />
        </div>
        <Container className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary-bright">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              {home.hero.eyebrow}
            </p>
            <h1 className="mt-4 text-h1">{home.hero.title}</h1>
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
            <ServiceSearch items={buildSearchItems(dictionary, lang, products, features)} className="mt-6 max-w-xl" />
            {/* Trust claims moved below the fold line: the message lands first, proof follows */}
            <ul aria-label={home.hero.trustLabel} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
              {BRAND.trustClaims.map((claim) => {
                const Icon = getIcon(claim.icon);
                return (
                  <li key={claim.key} className="flex items-center gap-2">
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-accent" strokeWidth={2} />
                    {home.hero.trust[claim.key]}
                  </li>
                );
              })}
            </ul>
          </div>
          <RequestPreview mockup={home.hero.mockup} />
        </Container>
        <div aria-hidden="true" className="divider-bronze absolute inset-x-0 bottom-0" />
      </section>

      <ProblemShortcuts title={dictionary.ux.problems.title} problems={getProblemShortcuts(dictionary, products, features)} />

      <SituationTiles
        title={home.situations.title}
        description={home.situations.description}
        groups={getSituationGroups(dictionary, products, features)}
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
              <ButtonLink href="/services" variant="linkOnDark">
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

      {features.aiDocumentReview && <AiReviewPanel copy={home.aiReview} href="/document-review" />}

      <TrustBlock copy={home.trust} contactLabel={dictionary.common.cta.contact} />

      {guides.length > 0 && <GuidesList copy={home.guides} guides={guides} />}

      <StatsStrip label={home.stats.label} stats={stats} />

      <TestimonialCarousel title={home.testimonials.title} items={BRAND.testimonials} />

      <Section labelledBy="faq-title" size="sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <h2 id="faq-title" className="text-section text-on-canvas">
              {home.faq.title}
            </h2>
            <ButtonLink href="/faq" variant="linkOnDark" className="mt-2">
              {home.faq.viewAll}
            </ButtonLink>
          </div>
          <FaqAccordion items={faqItems} />
        </div>
      </Section>
    </>
  );
}
