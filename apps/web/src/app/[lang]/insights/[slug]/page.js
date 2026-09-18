import { ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getDictionary, getPrimaryCta, getSecondaryCta, isFeatureEnabled, requireFeaturePage } from '@/brand';
import { LocaleLink } from '@/components/localeLink';
import { MarkdownContent } from '@/components/markdownContent';
import { ButtonLink, Card, PageHeader, Section } from '@/components/ui';
import { createCatalogLabels } from '@/lib/catalogLabels';
import { formatDate } from '@/lib/formatValues';
import { loadPublicApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

async function loadArticle(slug) {
  return loadPublicApi(`/articles/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const { data } = await loadArticle(slug);
  const article = data?.article;
  if (!article) return { title: getDictionary(lang).insights.metadata.title };
  return { title: article.Title, description: article.Summary };
}

export default async function InsightArticlePage({ params }) {
  requireFeaturePage('legalInsights');
  const { lang, slug } = await params;
  const dictionary = getDictionary(lang);
  const copy = dictionary.insights.article;
  const { status, data } = await loadArticle(slug);

  if (status === 404) notFound();

  const article = data?.article;
  if (!article) {
    return (
      <Section>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-h2 text-ink">{copy.loadErrorTitle}</h1>
          <p className="mt-3 text-ink-muted">{copy.loadErrorBody}</p>
          <ButtonLink href="/insights" variant="secondary" className="mt-6">
            {copy.backToInsights}
          </ButtonLink>
        </div>
      </Section>
    );
  }

  const labels = createCatalogLabels(dictionary);
  const publishedLabel = formatDate(article.publishedAt, lang);
  const updatedLabel = formatDate(article.updatedAt, lang);
  const hasFinder = isFeatureEnabled('solutionFinder');
  const primaryAction = hasFinder ? getSecondaryCta(dictionary) : getPrimaryCta(dictionary);
  const secondaryAction = hasFinder ? getPrimaryCta(dictionary) : null;

  return (
    <>
      <PageHeader
        title={article.Title}
        lead={article.Summary}
        eyebrow={
          <nav aria-label={copy.breadcrumbLabel}>
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <LocaleLink href="/insights" className="font-semibold text-white hover:underline">
                  {copy.insightsLink}
                </LocaleLink>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-4 text-white/60" strokeWidth={2} />
              </li>
              <li>
                <LocaleLink href={`/insights?topic=${article.Topic}`} className="font-semibold text-white hover:underline">
                  {labels.articleTopic(article.Topic)}
                </LocaleLink>
              </li>
            </ol>
          </nav>
        }
      >
        <p className="text-sm">
          {copy.published(publishedLabel)}
          {updatedLabel && updatedLabel !== publishedLabel ? ` · ${copy.updated(updatedLabel)}` : ''}
        </p>
      </PageHeader>

      <Section size="sm">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
          <MarkdownContent source={article.Body} />
          <Card as="aside" padding="md" aria-labelledby="article-help-title" className="lg:sticky lg:top-24">
            <h2 id="article-help-title" className="text-h4 text-ink">
              {copy.asideTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">{copy.asideBody}</p>
            <ButtonLink href={primaryAction.href} isFullWidth className="mt-4">
              {primaryAction.label}
            </ButtonLink>
            {secondaryAction && (
              <ButtonLink href={secondaryAction.href} variant="link" className="mt-3 w-full">
                {secondaryAction.label}
              </ButtonLink>
            )}
          </Card>
        </div>
      </Section>
    </>
  );
}
