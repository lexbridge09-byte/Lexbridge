import { requireFeaturePage } from '@/brand';
import { titleMetadata } from '@/brand/pageMetadata';
import { ArticleEditor } from '@/components/admin/articleEditor';

export const generateMetadata = titleMetadata((dictionary) => dictionary.admin.pageTitles.editArticle);

export default async function AdminEditArticlePage({ params }) {
  requireFeaturePage('legalInsights');
  const { id } = await params;
  return <ArticleEditor key={id} articleId={id} />;
}
