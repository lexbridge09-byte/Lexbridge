import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { DocumentsPanel } from '@/components/dashboard/documentsPanel';

export const generateMetadata = titleMetadata((dictionary) => dictionary.dashboard.documents.metadataTitle);

export default function DashboardDocumentsPage() {
  requireFeaturePage('documentUploads');
  return <DocumentsPanel />;
}
