import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { ConsultationsList } from '@/components/dashboard/consultationsList';

export const generateMetadata = titleMetadata((dictionary) => dictionary.dashboard.consultations.metadataTitle);

export default function DashboardConsultationsPage() {
  requireFeaturePage('consultationBooking');
  return <ConsultationsList />;
}
