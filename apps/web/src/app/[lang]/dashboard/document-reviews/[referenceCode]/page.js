import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { DocumentReviewDetail } from '@/components/documentReview/documentReviewDetail';

export const generateMetadata = titleMetadata((dictionary) => dictionary.documentReview.report.metadataTitle);

export default async function DashboardDocumentReviewPage({ params }) {
  requireFeaturePage('aiDocumentReview');
  const { referenceCode } = await params;
  return <DocumentReviewDetail key={referenceCode} referenceCode={referenceCode} />;
}
