import { titleMetadata } from '@/brand/pageMetadata';
import { RequestDetail } from '@/components/dashboard/requestDetail';

export const generateMetadata = titleMetadata((dictionary) => dictionary.dashboard.requestDetail.metadataTitle);

export default async function DashboardRequestPage({ params }) {
  const { referenceCode } = await params;
  return <RequestDetail key={referenceCode} referenceCode={referenceCode} />;
}
