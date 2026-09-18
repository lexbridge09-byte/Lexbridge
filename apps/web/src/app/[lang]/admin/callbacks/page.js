import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminCallbacks } from '@/components/admin/adminCallbacks';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.callbacks);

export default function AdminCallbacksPage() {
  requireFeaturePage('callbackRequests');
  return <AdminCallbacks />;
}
