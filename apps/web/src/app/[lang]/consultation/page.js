import { getDictionary, requireFeaturePage } from '@/brand';
import { ConsultationBooking } from '@/components/consultationBooking';
import { TaskPage } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).consultation.metadata;
}

// Tool page: the booking wizard is the page (its summary panel links to the FAQ)
export default async function ConsultationPage({ params }) {
  await requireFeaturePage('consultationBooking');
  const { lang } = await params;
  const copy = getDictionary(lang).consultation;

  return (
    <TaskPage title={copy.header.title}>
      <ConsultationBooking />
    </TaskPage>
  );
}
