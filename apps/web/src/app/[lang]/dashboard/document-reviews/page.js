import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { DocumentReviewsPanel } from '@/components/documentReview/documentReviewsPanel';

export const generateMetadata = titleMetadata((dictionary) => dictionary.documentReview.list.metadataTitle);

export default function DashboardDocumentReviewsPage() {
  requireFeaturePage('aiDocumentReview');
  return <DocumentReviewsPanel />;
}
