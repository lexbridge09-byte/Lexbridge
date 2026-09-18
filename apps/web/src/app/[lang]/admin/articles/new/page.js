import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { ArticleEditor } from '@/components/admin/articleEditor';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.newArticle);

export default function AdminNewArticlePage() {
  requireFeaturePage('legalInsights');
  return <ArticleEditor />;
}
