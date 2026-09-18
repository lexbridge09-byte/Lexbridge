import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { CouponEditor } from '@/components/admin/couponEditor';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.editCoupon);

export default async function AdminEditCouponPage({ params }) {
  requireFeaturePage('coupons');
  const { id } = await params;
  return <CouponEditor key={id} couponId={id} />;
}
