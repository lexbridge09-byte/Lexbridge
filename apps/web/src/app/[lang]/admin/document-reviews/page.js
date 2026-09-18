import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminDocumentReviews } from '@/components/admin/adminDocumentReviews';

export const generateMetadata = titleMetadata((dictionary) => dictionary.adminCommerce.pageTitles.documentReviews);

export default function AdminDocumentReviewsPage() {
  requireFeaturePage('aiDocumentReview');
  return <AdminDocumentReviews />;
}
