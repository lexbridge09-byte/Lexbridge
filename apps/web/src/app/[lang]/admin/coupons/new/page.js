import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { CouponEditor } from '@/components/admin/couponEditor';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.newCoupon);

export default function AdminNewCouponPage() {
  requireFeaturePage('coupons');
  return <CouponEditor />;
}
