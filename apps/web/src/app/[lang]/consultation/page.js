import { getDictionary, getFaqItems, getServerFeatures, requireFeaturePage } from '@/brand';
import { ConsultationBooking } from '@/components/consultationBooking';
import { FaqAccordion, TaskHelp, TaskPage } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).consultation.metadata;
}

export default async function ConsultationPage({ params }) {
  await requireFeaturePage('consultationBooking');
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const copy = dictionary.consultation;
  const faqItems = getFaqItems(dictionary, lang, features, { ids: copy.faq.ids });

  return (
    <TaskPage title={copy.header.title} lead={copy.header.lead}>
      <ConsultationBooking />
      {faqItems.length > 0 && (
        <TaskHelp title={copy.faq.title}>
          <FaqAccordion items={faqItems} isFirstOpen={false} />
        </TaskHelp>
      )}
    </TaskPage>
  );
}
