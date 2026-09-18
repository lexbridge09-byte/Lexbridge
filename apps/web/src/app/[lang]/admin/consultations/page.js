import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminConsultations } from '@/components/admin/adminConsultations';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.consultations);

export default function AdminConsultationsPage() {
  requireFeaturePage('consultationBooking');
  return <AdminConsultations />;
}
