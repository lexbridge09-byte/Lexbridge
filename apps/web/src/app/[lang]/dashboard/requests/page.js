import { titleMetadata } from '@/brand/pageMetadata';
import { RequestsList } from '@/components/dashboard/requestsList';

export const generateMetadata = titleMetadata((dictionary) => dictionary.dashboard.requests.metadataTitle);

export default function DashboardRequestsPage() {
  return <RequestsList />;
}
