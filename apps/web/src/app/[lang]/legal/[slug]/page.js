import { notFound } from 'next/navigation';
import { getDictionary } from '@/brand';
import { Card, InlineAlert, PageHeader, Section } from '@/components/ui';

export function generateStaticParams() {
  return Object.keys(getDictionary('en').legal.pages).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const legal = getDictionary(lang).legal;
  return { title: legal.pages[slug]?.title ?? legal.fallbackTitle };
}

export default async function LegalPage({ params }) {
  const { lang, slug } = await params;
  const legal = getDictionary(lang).legal;
  const legalPage = legal.pages[slug];
  if (!legalPage) notFound();

  return (
    <>
      <PageHeader title={legalPage.title} />
      <Section tone="alt" size="sm">
        <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
          <nav aria-labelledby="legal-contents-title" className="hidden lg:sticky lg:top-24 lg:block">
            <Card padding="md">
              <h2 id="legal-contents-title" className="text-sm font-semibold text-ink">
                {legal.contentsLabel}
              </h2>
              <ol className="mt-3 space-y-2">
                {legalPage.sections.map(([heading], sectionIndex) => (
                  <li key={heading}>
                    <a href={`#section-${sectionIndex + 1}`} className="text-sm text-ink-muted hover:text-primary">
                      {heading}
                    </a>
                  </li>
                ))}
              </ol>
            </Card>
          </nav>

          <Card padding="lg">
            <InlineAlert tone="info">{legal.draftNotice}</InlineAlert>
            <div className="mt-6 space-y-6">
              {legalPage.sections.map(([heading, body], sectionIndex) => (
                <section key={heading} id={`section-${sectionIndex + 1}`} className="scroll-mt-24">
                  <h2 className="text-h4 text-ink">{heading}</h2>
                  <p className="mt-1.5 max-w-[70ch] leading-7 text-ink-muted">{body}</p>
                </section>
              ))}
            </div>
          </Card>
        </div>
      </Section>
    </>
  );
}
