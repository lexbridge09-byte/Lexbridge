import { Check } from 'lucide-react';
import { getDictionary, getFaqItems, requireFeaturePage } from '@/brand';
import { DocumentReviewDropzone } from '@/components/documentReview/documentReviewDropzone';
import { ButtonLink, FaqAccordion, ProcessSteps, Section, SectionHeader } from '@/components/ui';
import { getIcon } from '@/lib/icons';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).documentReview.landing.metadata;
}

// Upload first: the drop zone sits above the fold; what you get, how it works and FAQ follow
export default async function DocumentReviewLandingPage({ params }) {
  requireFeaturePage('aiDocumentReview');
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const copy = dictionary.documentReview.landing;
  const faqItems = getFaqItems(dictionary, lang, { ids: copy.faq.ids });

  return (
    <>
      <Section tone="alt" size="sm">
        <div className="grid items-center gap-5 lg:grid-cols-[1fr_1.15fr] lg:gap-x-12">
          <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
            <h1 className="text-h2 text-ink">{copy.header.title}</h1>
            <p className="mt-2 text-base leading-7 text-ink-muted lg:text-lg">{copy.header.lead}</p>
          </div>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <DocumentReviewDropzone />
          </div>
          <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {copy.checks.map((check) => (
                <li key={check} className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Check aria-hidden="true" className="size-4 text-success" strokeWidth={2.5} />
                  {check}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">{copy.disclaimer}</p>
          </div>
        </div>
      </Section>

      <Section labelledBy="review-outputs-title">
        <SectionHeader id="review-outputs-title" title={copy.outputs.title} description={copy.outputs.description} />
        <ul className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.outputs.items.map((item) => {
            const Icon = getIcon(item.icon);
            return (
              <li key={item.title} className="rounded-card border border-line bg-white p-5">
                <span className="flex size-10 items-center justify-center rounded-control bg-primary-50 text-primary">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-3 font-display text-[15px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{item.description}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section tone="alt" labelledBy="review-steps-title">
        <SectionHeader id="review-steps-title" title={copy.steps.title} />
        <ProcessSteps steps={copy.steps.items} />
      </Section>

      <Section labelledBy="review-documents-title" size="sm">
        <SectionHeader id="review-documents-title" title={copy.documents.title} description={copy.documents.description} />
        <ul className="flex flex-wrap gap-2">
          {copy.documents.items.map((documentName) => (
            <li key={documentName} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink">
              {documentName}
            </li>
          ))}
        </ul>
      </Section>

      {faqItems.length > 0 && (
        <Section tone="alt" labelledBy="review-faq-title" size="sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div>
              <h2 id="review-faq-title" className="text-section text-ink">
                {copy.faq.title}
              </h2>
              <ButtonLink href="/faq" variant="link" className="mt-2">
                {dictionary.home.faq.viewAll}
              </ButtonLink>
            </div>
            <FaqAccordion items={faqItems} />
          </div>
        </Section>
      )}
    </>
  );
}
