import { ORDER_STATUSES } from '@lexbridge/shared';
import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminOrders } from '@/components/admin/adminOrders';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.orders);

export default async function AdminOrdersPage({ searchParams }) {
  requireFeaturePage('onlinePayments');
  const { status } = await searchParams;
  const initialStatus = ORDER_STATUSES.includes(status) ? status : '';
  return <AdminOrders key={initialStatus} initialStatus={initialStatus} />;
}
