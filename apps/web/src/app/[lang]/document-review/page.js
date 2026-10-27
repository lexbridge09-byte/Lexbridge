import { ArrowRight, FileText, ListChecks, MessageCircleQuestion, ShieldAlert } from 'lucide-react';
import { getDictionary, requireFeaturePage } from '@/brand';
import { DocumentReviewDropzone } from '@/components/documentReview/documentReviewDropzone';
import { LocaleLink } from '@/components/localeLink';
import { RailCard, TaskPage } from '@/components/ui';

// Icon per report section (keys come from documentReview.landing.outputs.items[].icon)
const OUTPUT_ICONS = { summary: FileText, contract: ListChecks, risk: ShieldAlert, lawyer: MessageCircleQuestion };

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).documentReview.landing.metadata;
}

// Tool page: the upload flow is the page; what you get and help live in the side rail
export default async function DocumentReviewPage({ params }) {
  await requireFeaturePage('aiDocumentReview');
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const copy = dictionary.documentReview.landing;
  const nav = dictionary.common.nav;

  const rail = (
    <>
      <RailCard title={copy.outputs.title} tip={copy.outputs.description}>
        <ul className="space-y-3">
          {copy.outputs.items.map((item) => {
            const Icon = OUTPUT_ICONS[item.icon] ?? FileText;
            return (
              <li key={item.title} className="flex gap-2.5">
                <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary-bright" strokeWidth={1.75} />
                <span>
                  <span className="block font-semibold text-on-canvas">{item.title}</span>
                  <span className="block text-xs leading-5">{item.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </RailCard>
      <RailCard title={copy.documents.title} tip={copy.documents.description}>
        <p className="text-xs leading-5 text-on-canvas">{copy.documents.items.join(' · ')}</p>
      </RailCard>
      <RailCard title={nav.needHelp}>
        <p className="text-xs leading-5">{copy.disclaimer}</p>
        <LocaleLink href="/faq" className="group mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-bright">
          {nav.faq}
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform duration-(--dur-150) group-hover:translate-x-0.5" strokeWidth={2} />
        </LocaleLink>
      </RailCard>
    </>
  );

  return (
    <TaskPage title={copy.metadata.title} rail={rail}>
      <DocumentReviewDropzone />
    </TaskPage>
  );
}
