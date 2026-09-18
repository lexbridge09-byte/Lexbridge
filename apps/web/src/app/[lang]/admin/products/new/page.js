import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { ProductEditor } from '@/components/admin/productEditor';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.newProduct);

export default function AdminNewProductPage() {
  requireFeaturePage('serviceCatalog');
  return <ProductEditor />;
}
