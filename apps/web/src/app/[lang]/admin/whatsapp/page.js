import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminWhatsAppContacts } from '@/components/admin/adminWhatsAppContacts';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.whatsapp);

export default function AdminWhatsAppPage() {
  requireFeaturePage('whatsAppAiAssistant');
  return <AdminWhatsAppContacts />;
}
