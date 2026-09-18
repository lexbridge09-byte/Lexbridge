import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { ProductEditor } from '@/components/admin/productEditor';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.editProduct);

export default async function AdminEditProductPage({ params }) {
  requireFeaturePage('serviceCatalog');
  const { id } = await params;
  return <ProductEditor key={id} productId={id} />;
}
