import { ArrowRight } from 'lucide-react';
import { ARTICLE_TOPIC_KEYS } from '@lexbridge/shared';
import { getDictionary, requireFeaturePage } from '@/brand';
import { LocaleLink } from '@/components/localeLink';
import { Container, PageHero, Section, Stagger, StaggerItem } from '@/components/ui';
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
      className={`block whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-(--dur-150) active:scale-(--press-scale) ${isActive ? 'bg-cta text-canvas' : 'text-on-canvas-muted ring-1 ring-inset ring-line-canvas hover:text-on-canvas hover:ring-primary/50'}`}
    >
      {label}
    </LocaleLink>
  );
}

// One guide card. The lead story is wider and taller, with a larger serif title.
function GuideCard({ article, labels, lang, isLead = false }) {
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-panel border p-6 transition-[transform,border-color,box-shadow] duration-(--dur-300) ease-(--ease-out-soft) hover:-translate-y-1 hover:border-primary/50 hover:shadow-float motion-reduce:hover:translate-y-0 ${isLead ? 'border-primary/25 bg-hero lg:p-8' : 'border-line-canvas bg-canvas-alt'}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.2),transparent)] opacity-0 transition-opacity duration-(--dur-300) group-hover:opacity-100" />
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-bright">
        {labels.articleTopic(article.Topic)}
        <span aria-hidden="true" className="text-on-canvas-subtle">·</span>
        <span className="font-medium normal-case tracking-normal text-on-canvas-subtle">{formatDate(article.publishedAt, lang)}</span>
      </p>
      <h3 className={`mt-3 font-heading font-bold leading-tight text-on-canvas ${isLead ? 'text-3xl lg:text-4xl' : 'text-xl'}`}>
        <LocaleLink href={`/insights/${article.Slug}`} className="after:absolute after:inset-0 after:content-['']">
          {article.Title}
        </LocaleLink>
      </h3>
      {article.Summary && <p className={`mt-3 flex-1 leading-7 text-on-canvas-muted ${isLead ? 'line-clamp-4 text-base' : 'line-clamp-3 text-sm'}`}>{article.Summary}</p>}
      <ArrowRight aria-hidden="true" className="mt-4 size-5 text-primary-bright transition-transform duration-(--dur-200) group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2} />
    </article>
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
      <PageHero title={copy.header.title} />

      {/* Topics stay reachable while scrolling the list */}
      <nav aria-label={copy.topicsLabel} className="sticky top-16 z-30 border-b border-line-canvas bg-canvas/90 backdrop-blur-md">
        <Container>
          <ul className="scroll-row flex gap-2 overflow-x-auto py-3">
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

      <Section labelledBy="guides-title">
        <h2 id="guides-title" className="text-section text-on-canvas">
          {listTitle}
        </h2>

        {hasArticles ? (
          <Stagger gap={0.05} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, articleIndex) => {
              const isLead = articleIndex === 0 && !activeTopic && articles.length > 2;
              return (
                <StaggerItem key={article._id} className={isLead ? 'sm:col-span-2 lg:row-span-2' : ''}>
                  <GuideCard article={article} labels={labels} lang={lang} isLead={isLead} />
                </StaggerItem>
              );
            })}
          </Stagger>
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
            <Stagger gap={0.05} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {copy.popularGuides.map((guide, guideIndex) => (
                <StaggerItem key={guide} className="flex items-start gap-4 rounded-card border border-line-canvas bg-canvas-alt p-5">
                  <span className="tabular font-brand text-2xl font-bold leading-none text-primary-bright">{String(guideIndex + 1).padStart(2, '0')}</span>
                  <span className="font-semibold leading-6 text-on-canvas">{guide}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </>
        )}
      </Section>
    </>
  );
}
