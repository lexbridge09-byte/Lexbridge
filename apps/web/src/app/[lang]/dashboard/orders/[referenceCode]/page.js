import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { OrderDetail } from '@/components/dashboard/orderDetail';

export const generateMetadata = titleMetadata((dictionary) => dictionary.commerce.orderDetail.metadataTitle);

export default async function DashboardOrderPage({ params }) {
  requireFeaturePage('onlinePayments');
  const { referenceCode } = await params;
  return <OrderDetail key={referenceCode} referenceCode={referenceCode} />;
}
