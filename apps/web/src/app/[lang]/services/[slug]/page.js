import { CalendarDays, Check, ChevronRight, FileText, Lock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getDictionary, isFeatureEnabled, requireFeaturePage } from '@/brand';
import { ProductCard, ProductPrice } from '@/components/commerce/productCard';
import { LocaleLink } from '@/components/localeLink';
import { Badge, ButtonLink, Card, FaqAccordion, PageHeader, Section, SectionHeader } from '@/components/ui';
import { createCatalogLabels } from '@/lib/catalogLabels';
import { formatRupees } from '@/lib/formatValues';
import { loadPublishedProducts } from '@/lib/publicProducts';
import { loadPublicApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

const RELATED_PRODUCT_LIMIT = 3;

async function loadProduct(slug) {
  const { status, data } = await loadPublicApi(`/products/${encodeURIComponent(slug)}`);
  if (status === 404) notFound();
  if (!data?.product) throw new Error(`Product ${slug} could not be loaded (status ${status})`);
  return data.product;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!isFeatureEnabled('serviceCatalog')) return {};
  const { data } = await loadPublicApi(`/products/${encodeURIComponent(slug)}`);
  return data?.product ? { title: data.product.Title, description: data.product.Summary } : {};
}

function ListCard({ title, icon: Icon, items }) {
  if (!items?.length) return null;
  return (
    <Card as="section" padding="md">
      <h2 className="text-h4 text-ink">{title}</h2>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[15px] leading-6 text-ink">
            <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-success" strokeWidth={2.25} />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StepsCard({ title, steps }) {
  return (
    <Card as="section" padding="md">
      <h2 className="text-h4 text-ink">{title}</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2">
        {steps.map((step, stepIndex) => (
          <li key={step.title} className="flex gap-3">
            <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
              {stepIndex + 1}
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-6 text-ink-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// Savings only when the "was" price is genuinely higher
function deriveSaving(product) {
  const { PricePaise: pricePaise, CompareAtPricePaise: compareAtPaise } = product;
  if (!Number.isFinite(compareAtPaise) || compareAtPaise <= pricePaise) return null;
  return { amountPaise: compareAtPaise - pricePaise, percent: Math.round(((compareAtPaise - pricePaise) / compareAtPaise) * 100) };
}

export default async function ProductPage({ params }) {
  requireFeaturePage('serviceCatalog');
  const { lang, slug } = await params;
  const dictionary = getDictionary(lang);
  const copy = dictionary.commerce.product;
  const labels = createCatalogLabels(dictionary);
  const [product, publishedProducts] = await Promise.all([loadProduct(slug), loadPublishedProducts()]);
  const canBuy = isFeatureEnabled('onlinePayments');
  const action = canBuy
    ? { href: `/checkout/${product.Slug}`, label: copy.buyNow, note: copy.buyNote }
    : { href: `/contact?service=${product.ServiceCategory}`, label: copy.request, note: copy.requestNote };
  const faqItems = (product.FaqItems ?? []).map((item, itemIndex) => ({ id: `faq-${itemIndex}`, question: item.Question, answer: item.Answer }));
  const saving = deriveSaving(product);
  const relatedProducts = publishedProducts
    .filter((candidate) => candidate.Category === product.Category && candidate.Slug !== product.Slug)
    .slice(0, RELATED_PRODUCT_LIMIT);

  return (
    <>
      <PageHeader
        title={product.Title}
        lead={product.Summary}
        eyebrow={
          <nav aria-label={copy.breadcrumb}>
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <LocaleLink href="/services" className="font-semibold text-white hover:underline">
                  {copy.breadcrumb}
                </LocaleLink>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-4 text-white/60" strokeWidth={2} />
              </li>
              <li>
                <LocaleLink href={`/services?category=${product.Category}`} className="font-semibold text-white hover:underline">
                  {labels.productCategory(product.Category)}
                </LocaleLink>
              </li>
            </ol>
          </nav>
        }
      >
        {product.TurnaroundText && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white ring-1 ring-white/15">
            <CalendarDays aria-hidden="true" className="size-4 text-accent" strokeWidth={1.75} />
            <span className="text-white/75">{copy.turnaroundLabel}:</span> {product.TurnaroundText}
          </p>
        )}
      </PageHeader>

      <Section tone="alt" size="sm">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem] lg:gap-8">
          <div className="space-y-5">
            <ListCard title={copy.inclusionsTitle} icon={Check} items={product.Inclusions} />
            <StepsCard title={copy.stepsTitle} steps={copy.steps} />
            <ListCard title={copy.documentsTitle} icon={FileText} items={product.DocumentsRequired} />
            {faqItems.length > 0 && (
              <section aria-labelledby="product-faq-title">
                <h2 id="product-faq-title" className="mb-3 text-h4 text-ink">
                  {copy.faqTitle}
                </h2>
                <FaqAccordion items={faqItems} isFirstOpen={false} />
              </section>
            )}
          </div>

          <Card as="aside" padding="md" aria-label={copy.stickyLabel} className="hidden lg:sticky lg:top-24 lg:block">
            <ProductPrice pricePaise={product.PricePaise} compareAtPricePaise={product.CompareAtPricePaise} size="lg" />
            {saving && (
              <Badge tone="offer" className="mt-2">
                {copy.save(formatRupees(saving.amountPaise, lang), saving.percent)}
              </Badge>
            )}
            {product.GovernmentFeeNote && (
              <p className="mt-3 text-xs leading-5 text-ink-muted">
                <span className="font-semibold text-ink">{copy.governmentFeeLabel}:</span> {product.GovernmentFeeNote}
              </p>
            )}
            <ButtonLink href={action.href} isFullWidth size="lg" className="mt-5">
              {action.label}
            </ButtonLink>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <Lock aria-hidden="true" className="size-3.5 text-success" strokeWidth={2} />
              {action.note}
            </p>

            <ul className="mt-5 space-y-2 border-t border-line pt-4">
              {copy.assurances.map((assurance) => (
                <li key={assurance} className="flex items-start gap-2 text-sm text-ink">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.25} />
                  {assurance}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
              <span className="text-ink-muted">{copy.questionsTitle}</span>
              <LocaleLink href="/contact" className="font-semibold text-primary hover:underline">
                {copy.contactLink}
              </LocaleLink>
            </p>
          </Card>
        </div>
      </Section>

      {relatedProducts.length > 0 && (
        <Section labelledBy="related-title" size="sm">
          <SectionHeader id="related-title" title={copy.relatedTitle} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((relatedProduct) => (
              <li key={relatedProduct._id}>
                <ProductCard product={relatedProduct} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Mobile buy bar sits above the tab bar; the spacer keeps the footer reachable */}
      <div aria-hidden="true" className="h-[4.5rem] lg:hidden" />
      <aside
        aria-label={copy.stickyLabel}
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white px-4 py-2.5 shadow-[0_-6px_18px_rgb(31_23_32/0.06)] lg:hidden print:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <ProductPrice pricePaise={product.PricePaise} compareAtPricePaise={product.CompareAtPricePaise} />
            {product.TurnaroundText && <p className="truncate text-xs text-ink-muted">{product.TurnaroundText}</p>}
          </div>
          <ButtonLink href={action.href} size="sm" className="shrink-0">
            {action.label}
          </ButtonLink>
        </div>
      </aside>
    </>
  );
}
