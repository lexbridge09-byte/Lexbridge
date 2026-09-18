import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { OrdersList } from '@/components/dashboard/ordersList';

export const generateMetadata = titleMetadata((dictionary) => dictionary.commerce.orders.metadataTitle);

export default function DashboardOrdersPage() {
  requireFeaturePage('onlinePayments');
  return <OrdersList />;
}
