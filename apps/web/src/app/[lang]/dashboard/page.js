import { titleMetadata } from '@/brand/pageMetadata';
import { DashboardOverview } from '@/components/dashboard/dashboardOverview';

export const generateMetadata = titleMetadata((dictionary) => dictionary.dashboard.overview.metadataTitle);

export default function DashboardPage() {
  return <DashboardOverview />;
}
