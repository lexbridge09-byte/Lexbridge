import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminOrderDetail } from '@/components/admin/adminOrderDetail';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.order);

export default async function AdminOrderPage({ params }) {
  requireFeaturePage('onlinePayments');
  const { referenceCode } = await params;
  return <AdminOrderDetail key={referenceCode} referenceCode={referenceCode} />;
}
