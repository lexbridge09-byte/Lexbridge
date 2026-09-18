import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminProducts } from '@/components/admin/adminProducts';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.products);

export default function AdminProductsPage() {
  requireFeaturePage('serviceCatalog');
  return <AdminProducts />;
}
