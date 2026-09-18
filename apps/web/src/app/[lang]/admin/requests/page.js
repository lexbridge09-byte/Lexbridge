import { REQUEST_STATUSES } from '@lexbridge/shared';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminRequests } from '@/components/admin/adminRequests';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.requests);

export default async function AdminRequestsPage({ searchParams }) {
  const { status } = await searchParams;
  const initialStatus = REQUEST_STATUSES.includes(status) ? status : '';
  return <AdminRequests key={initialStatus} initialStatus={initialStatus} />;
}
