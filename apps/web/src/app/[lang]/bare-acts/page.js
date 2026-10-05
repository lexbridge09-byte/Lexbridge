import { ExternalLink } from 'lucide-react';
import { getDictionary } from '@/brand';
import { Container, PageHeader, Section } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: getDictionary(lang).bareActs.metadataTitle, description: getDictionary(lang).bareActs.header.lead };
}

// Language-neutral grouping: group key -> act keys in reading order
const GROUP_ACTS = {
  foundation: ['constitution'],
  civil: ['contract-act', 'transfer-of-property-act', 'specific-relief-act', 'limitation-act', 'registration-act'],
  criminal: ['bharatiya-nyaya-sanhita', 'bharatiya-nagarik-suraksha-sanhita', 'bharatiya-sakshya-adhiniyam', 'indian-penal-code'],
  family: ['hindu-marriage-act', 'special-marriage-act', 'hindu-succession-act', 'shariat-application-act'],
  business: ['companies-act', 'indian-partnership-act', 'llp-act', 'negotiable-instruments-act', 'sale-of-goods-act', 'indian-stamp-act'],
  consumer: ['consumer-protection-act', 'information-technology-act', 'rera'],
};

const GROUP_ORDER = ['foundation', 'civil', 'criminal', 'family', 'business', 'consumer'];

// LexBridge does not host act texts; every act opens a scoped search of the official
// India Code portal, whose first result is the authoritative government PDF.
function indiaCodeSearchUrl(actName) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${actName} site:indiacode.nic.in`)}`;
}

export default async function BareActsPage({ params }) {
  const { lang } = await params;
  const copy = getDictionary(lang).bareActs;

  return (
    <>
      <PageHeader title={copy.header.title} lead={copy.header.lead} />

      <Section tone="alt" size="sm">
        <Container className="max-w-4xl">
          <p className="rounded-xl border border-line-canvas bg-canvas-alt px-4 py-3 text-sm leading-6 text-on-canvas-muted">
            {copy.portalNote}{' '}
            <a
              href="https://www.indiacode.nic.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-bright underline underline-offset-4 hover:decoration-2"
            >
              {copy.portalLabel}
            </a>
          </p>
        </Container>
      </Section>

      <Section labelledBy="bare-acts-groups">
        <Container className="max-w-4xl">
          <div className="space-y-10">
            {GROUP_ORDER.map((groupKey) => {
              const group = copy.groups[groupKey];
              return (
                <section key={groupKey} aria-labelledby={`bare-acts-${groupKey}`}>
                  <h2 id={`bare-acts-${groupKey}`} className="text-h3 text-on-canvas">
                    {group.label}
                  </h2>
                  <p className="mt-1 text-sm text-on-canvas-muted">{group.description}</p>
                  <ul className="mt-4 grid gap-3">
                    {GROUP_ACTS[groupKey].map((actKey) => {
                      const act = copy.acts[actKey];
                      return (
                        <li key={actKey}>
                          <article className="lift flex flex-col gap-2 rounded-card border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                              <h3 className="font-display text-[15px] font-semibold text-ink">
                                {act.name}
                                <span className="tabular ml-2 text-xs font-medium text-ink-muted">{act.year}</span>
                              </h3>
                              <p className="mt-0.5 text-sm leading-6 text-ink-muted">{act.description}</p>
                            </div>
                            <a
                              href={indiaCodeSearchUrl(`${act.name} ${act.year}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-primary-dark px-3.5 py-2 text-sm font-semibold text-primary-dark transition-colors duration-(--dur-150) hover:bg-primary-50"
                            >
                              {copy.readLabel}
                              <ExternalLink aria-hidden="true" className="size-4" strokeWidth={2} />
                              <span className="sr-only">: {act.name}</span>
                            </a>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <p className="mt-10 border-t border-line-canvas pt-6 text-sm leading-6 text-on-canvas-muted">{copy.disclaimer}</p>
        </Container>
      </Section>
    </>
  );
}
