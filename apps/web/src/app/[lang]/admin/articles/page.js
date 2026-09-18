import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { AdminArticles } from '@/components/admin/adminArticles';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.articles);

export default function AdminArticlesPage() {
  requireFeaturePage('legalInsights');
  return <AdminArticles />;
}
