import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminCoupons } from '@/components/admin/adminCoupons';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.coupons);

export default function AdminCouponsPage() {
  requireFeaturePage('coupons');
  return <AdminCoupons />;
}
