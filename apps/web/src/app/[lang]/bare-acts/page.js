import { Landmark } from 'lucide-react';
import { getDictionary } from '@/brand';
import { BareActsLibrary } from '@/components/bareActsLibrary';
import { Container, PageHero } from '@/components/ui';

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

// LexBridge Consultants does not host act texts; every act opens a scoped search of the official
// India Code portal, whose first result is the authoritative government PDF.
function indiaCodeSearchUrl(actName) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${actName} site:indiacode.nic.in`)}`;
}

export default async function BareActsPage({ params }) {
  const { lang } = await params;
  const copy = getDictionary(lang).bareActs;
  const groups = GROUP_ORDER.map((groupKey) => ({ key: groupKey, ...copy.groups[groupKey] }));
  const acts = GROUP_ORDER.flatMap((groupKey) =>
    GROUP_ACTS[groupKey].map((actKey) => {
      const act = copy.acts[actKey];
      return { key: actKey, group: groupKey, name: act.name, year: act.year, description: act.description, url: indiaCodeSearchUrl(`${act.name} ${act.year}`) };
    }),
  );
  // Only plain strings cross into the client library
  const libraryCopy = {
    searchLabel: copy.searchLabel,
    searchPlaceholder: copy.searchPlaceholder,
    allGroups: copy.allGroups,
    countAll: copy.countAll,
    countSome: copy.countSome,
    emptyTitle: copy.emptyTitle,
    clear: copy.clear,
    readLabel: copy.readLabel,
  };

  return (
    <>
      <PageHero title={copy.header.title}>
        <p className="flex max-w-3xl items-start gap-2 text-xs leading-5 text-on-canvas-subtle">
          <Landmark aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-bright" strokeWidth={1.75} />
          <span>
            {copy.portalNote}{' '}
            <a href="https://www.indiacode.nic.in/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-bright underline underline-offset-4">
              {copy.portalLabel}
            </a>
          </span>
        </p>
      </PageHero>

      <Container className="py-8 lg:py-10">
        <BareActsLibrary groups={groups} acts={acts} copy={libraryCopy} />
        <p className="mt-10 border-t border-line-canvas pt-6 text-sm leading-6 text-on-canvas-subtle">{copy.disclaimer}</p>
      </Container>
    </>
  );
}
