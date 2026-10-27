import { getDictionary, getFaqItems, getServerFeatures, requireFeaturePage } from '@/brand';
import { DocumentReviewDropzone } from '@/components/documentReview/documentReviewDropzone';
import { Card, FaqAccordion, TaskHelp, TaskPage } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).documentReview.landing.metadata;
}

export default async function DocumentReviewPage({ params }) {
  await requireFeaturePage('aiDocumentReview');
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const copy = dictionary.documentReview.landing;
  const faqItems = getFaqItems(dictionary, lang, features, { ids: copy.faq.ids });

  return (
    <TaskPage title={copy.header.title} lead={copy.header.lead}>
      <p className="mb-4 border-l-2 border-primary pl-3 text-sm text-on-canvas-muted">{copy.disclaimer}</p>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <DocumentReviewDropzone />
        <Card as="aside" aria-labelledby="review-outputs-title">
          <h2 id="review-outputs-title" className="text-h4 text-ink">{copy.outputs.title}</h2>
          <ul className="mt-3 divide-y divide-line">
            {copy.outputs.items.map((item) => (
              <li key={item.title} className="py-3 first:pt-0 last:pb-0">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{item.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <TaskHelp title={copy.documents.title}>
        <p>{copy.documents.description}</p>
        <ul className="grid list-inside list-disc gap-2 sm:grid-cols-2">
          {copy.documents.items.map((name) => <li key={name}>{name}</li>)}
        </ul>
      </TaskHelp>
      {faqItems.length > 0 && <TaskHelp title={copy.faq.title}><FaqAccordion items={faqItems} isFirstOpen={false} /></TaskHelp>}
    </TaskPage>
  );
}
