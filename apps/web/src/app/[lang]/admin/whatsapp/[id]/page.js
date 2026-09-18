import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminWhatsAppContact } from '@/components/admin/adminWhatsAppContact';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.whatsappContact);

export default async function AdminWhatsAppContactPage({ params }) {
  requireFeaturePage('whatsAppAiAssistant');
  const { id } = await params;
  return <AdminWhatsAppContact key={id} contactId={id} />;
}
