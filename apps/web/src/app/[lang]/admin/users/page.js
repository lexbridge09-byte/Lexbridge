import { titleMetadata } from '@/brand/pageMetadata';
import { AdminUsers } from '@/components/admin/adminUsers';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.users);

export default function AdminUsersPage() {
  return <AdminUsers />;
}
