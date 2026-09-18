import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminSlots } from '@/components/admin/adminSlots';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.slots);

export default function AdminSlotsPage() {
  requireFeaturePage('consultationBooking');
  return <AdminSlots />;
}
