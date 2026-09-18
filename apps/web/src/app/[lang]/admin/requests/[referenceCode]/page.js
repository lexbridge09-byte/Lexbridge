import { titleMetadata } from '@/brand/pageMetadata';
import { AdminRequestDetail } from '@/components/admin/adminRequestDetail';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.request);

export default async function AdminRequestPage({ params }) {
  const { referenceCode } = await params;
  return <AdminRequestDetail key={referenceCode} referenceCode={referenceCode} />;
}
