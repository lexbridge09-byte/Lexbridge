import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminDocumentReviewDetail } from '@/components/admin/adminDocumentReviewDetail';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.documentReview);

export default async function AdminDocumentReviewPage({ params }) {
  requireFeaturePage('aiDocumentReview');
  const { referenceCode } = await params;
  return <AdminDocumentReviewDetail key={referenceCode} referenceCode={referenceCode} />;
}
