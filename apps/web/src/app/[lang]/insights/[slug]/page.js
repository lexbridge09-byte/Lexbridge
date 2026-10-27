import { ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getDictionary, getPrimaryCta, getSecondaryCta, getServerFeatures, requireFeaturePage } from '@/brand';
import { LocaleLink } from '@/components/localeLink';
import { MarkdownContent } from '@/components/markdownContent';
import { ReadingProgress } from '@/components/readingProgress';
import { ButtonLink, Container, Section } from '@/components/ui';
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
  await requireFeaturePage('legalInsights');
  const { lang, slug } = await params;
  const [dictionary, features] = await Promise.all([getDictionary(lang), getServerFeatures()]);
  const copy = dictionary.insights.article;
  const { status, data } = await loadArticle(slug);

  if (status === 404) notFound();

  const article = data?.article;
  if (!article) {
    return (
      <Section>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-h2 text-on-canvas">{copy.loadErrorTitle}</h1>
          <p className="mt-3 text-on-canvas-muted">{copy.loadErrorBody}</p>
          <ButtonLink href="/insights" variant="onDarkBronze" className="mt-6">
            {copy.backToInsights}
          </ButtonLink>
        </div>
      </Section>
    );
  }

  const labels = createCatalogLabels(dictionary);
  const publishedLabel = formatDate(article.publishedAt, lang);
  const updatedLabel = formatDate(article.updatedAt, lang);
  const hasFinder = features.solutionFinder;
  const primaryAction = hasFinder ? getSecondaryCta(dictionary, features) : getPrimaryCta(dictionary, features);
  const secondaryAction = hasFinder ? getPrimaryCta(dictionary, features) : null;

  return (
    <>
      <ReadingProgress />
      <article>
        <header className="relative isolate border-b border-line-canvas bg-hero">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid-lines [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <Container className="max-w-4xl py-10 lg:py-16">
            <nav aria-label={copy.breadcrumbLabel}>
              <ol className="flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em]">
                <li>
                  <LocaleLink href="/insights" className="text-on-canvas-subtle transition-colors duration-(--dur-150) hover:text-primary-bright">
                    {copy.insightsLink}
                  </LocaleLink>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5 text-on-canvas-subtle" strokeWidth={2} />
                </li>
                <li>
                  <LocaleLink href={`/insights?topic=${article.Topic}`} className="text-primary-bright hover:underline">
                    {labels.articleTopic(article.Topic)}
                  </LocaleLink>
                </li>
              </ol>
            </nav>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.1] text-on-canvas sm:text-5xl">{article.Title}</h1>
            {article.Summary && <p className="mt-4 max-w-2xl text-lg leading-8 text-on-canvas-muted">{article.Summary}</p>}
            <p className="mt-5 text-sm text-on-canvas-subtle">
              {copy.published(publishedLabel)}
              {updatedLabel && updatedLabel !== publishedLabel ? ` · ${copy.updated(updatedLabel)}` : ''}
            </p>
          </Container>
        </header>

        <Container className="max-w-6xl py-10 lg:py-14">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
            <MarkdownContent source={article.Body} />
            <aside aria-labelledby="article-help-title" className="relative overflow-hidden rounded-panel border border-primary/25 bg-hero p-5 lg:sticky lg:top-24">
              <div aria-hidden="true" className="absolute -right-10 -top-10 size-36 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.28),transparent)]" />
              <h2 id="article-help-title" className="relative font-heading text-2xl font-bold text-on-canvas">
                {copy.asideTitle}
              </h2>
              <p className="relative mt-1 text-sm leading-6 text-on-canvas-muted">{copy.asideBody}</p>
              <ButtonLink href={primaryAction.href} isFullWidth className="relative mt-4">
                {primaryAction.label}
              </ButtonLink>
              {secondaryAction && (
                <ButtonLink href={secondaryAction.href} variant="linkOnDark" className="relative mt-3 w-full">
                  {secondaryAction.label}
                </ButtonLink>
              )}
            </aside>
          </div>
        </Container>
      </article>
    </>
  );
}
