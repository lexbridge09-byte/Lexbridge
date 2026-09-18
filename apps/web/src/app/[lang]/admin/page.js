import { titleMetadata } from '@/brand/pageMetadata';
import { AdminOverview } from '@/components/admin/adminOverview';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.overview);

export default function AdminPage() {
  return <AdminOverview />;
}
