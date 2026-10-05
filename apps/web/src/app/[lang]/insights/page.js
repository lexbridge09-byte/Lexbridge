import { ARTICLE_TOPIC_KEYS } from '@lexbridge/shared';
import { getDictionary, requireFeaturePage } from '@/brand';
import { LocaleLink } from '@/components/localeLink';
import { Badge, Container, PageHeader, Section } from '@/components/ui';
import { createCatalogLabels } from '@/lib/catalogLabels';
import { formatDate } from '@/lib/formatValues';
import { loadPublicApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).insights.metadata;
}

function TopicChip({ href, label, isActive }) {
  return (
    <LocaleLink
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${isActive ? 'bg-cta text-canvas' : 'bg-card-dim text-ink-muted hover:bg-primary-50 hover:text-primary-dark'}`}
    >
      {label}
    </LocaleLink>
  );
}

export default async function InsightsPage({ params, searchParams }) {
  requireFeaturePage('legalInsights');
  const { lang } = await params;
  const { topic } = await searchParams;
  const dictionary = getDictionary(lang);
  const copy = dictionary.insights;
  const labels = createCatalogLabels(dictionary);
  const activeTopic = ARTICLE_TOPIC_KEYS.includes(topic) ? topic : '';
  const { data } = await loadPublicApi(`/articles${activeTopic ? `?topic=${activeTopic}` : ''}`);
  const articles = data?.articles ?? null;
  const hasArticles = Boolean(articles?.length);
  const listTitle = activeTopic ? labels.articleTopic(activeTopic) : hasArticles ? copy.latestTitle : copy.popularTitle;

  return (
    <>
      <PageHeader title={copy.header.title} lead={copy.header.lead} />

      <nav aria-label={copy.topicsLabel} className="border-b border-line bg-card">
        <Container>
          <ul className="flex gap-2 overflow-x-auto py-3">
            <li className="shrink-0">
              <TopicChip href="/insights" label={copy.allTopics} isActive={!activeTopic} />
            </li>
            {ARTICLE_TOPIC_KEYS.map((topicKey) => (
              <li key={topicKey} className="shrink-0">
                <TopicChip href={`/insights?topic=${topicKey}`} label={labels.articleTopic(topicKey)} isActive={topicKey === activeTopic} />
              </li>
            ))}
          </ul>
        </Container>
      </nav>

      <Section tone="alt" labelledBy="guides-title" size="sm">
        <h2 id="guides-title" className="text-h2 text-on-canvas">
          {listTitle}
        </h2>

        {hasArticles ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article._id}>
                <article className="relative flex h-full flex-col rounded-card border border-line bg-card p-5 shadow-sm transition-[border-color,box-shadow] duration-(--dur-200) ease-(--ease-out-soft) hover:border-primary-100 hover:shadow-card motion-reduce:transition-none">
                  <Badge tone="active" className="self-start">
                    {labels.articleTopic(article.Topic)}
                  </Badge>
                  <h3 className="mt-3 text-h4 text-ink">
                    <LocaleLink href={`/insights/${article.Slug}`} className="after:absolute after:inset-0 after:rounded-card after:content-['']">
                      {article.Title}
                    </LocaleLink>
                  </h3>
                  {article.Summary && <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-ink-muted">{article.Summary}</p>}
                  <p className="mt-3 text-xs font-medium text-ink-muted">{formatDate(article.publishedAt, lang)}</p>
                </article>
              </li>
            ))}
          </ul>
        ) : activeTopic && articles ? (
          <p className="mt-4 text-on-canvas-muted">
            {copy.emptyTopic}{' '}
            <LocaleLink href="/insights" className="font-semibold text-primary-bright underline underline-offset-4">
              {copy.browseAll}
            </LocaleLink>
          </p>
        ) : (
          <>
            <p className="mt-2 text-on-canvas-muted">{copy.preparingNote}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {copy.popularGuides.map((guide) => (
                <li key={guide} className="rounded-card border border-line bg-card p-4 font-display font-semibold leading-6 text-ink">
                  {guide}
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </>
  );
}
