import { ChevronRight } from 'lucide-react';
import { BRAND, getDictionary, getProblemShortcuts, getServerFeatures, requireFeaturePage } from '@/brand';
import { LocaleLink } from '@/components/localeLink';
import { SolutionFinder } from '@/components/solutionFinder';
import { Stagger, StaggerItem, TaskPage } from '@/components/ui';
import { getIcon } from '@/lib/icons';
import { loadPublishedProducts } from '@/lib/publicProducts';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).solutionFinder.metadata;
}

export default async function FindMySolutionPage({ params, searchParams }) {
  await requireFeaturePage('solutionFinder');
  const { lang } = await params;
  const { concern } = await searchParams;
  const dictionary = getDictionary(lang);
  const copy = dictionary.solutionFinder;
  const features = await getServerFeatures();
  const products = features.serviceCatalog ? await loadPublishedProducts() : [];
  const problems = getProblemShortcuts(dictionary, products, features);
  const initialConcern = typeof concern === 'string' ? concern.slice(0, 3000) : '';

  // Side panel: people who recognise their problem can skip typing; trust points sit underneath
  const aside = (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="rounded-panel border border-line-canvas bg-canvas-alt p-5">
        <p className="text-h4 text-on-canvas">{copy.form.commonTitle}</p>
        <p className="mt-0.5 text-xs text-on-canvas-subtle">{copy.form.commonHint}</p>
        <Stagger gap={0.03} className="mt-4 space-y-1">
          {problems.map((problem) => {
            const Icon = getIcon(problem.icon);
            return (
              <StaggerItem key={problem.id}>
                <LocaleLink
                  href={problem.href}
                  className="group flex items-center gap-3 rounded-control px-2.5 py-2 text-sm font-medium text-on-canvas-muted transition-colors duration-(--dur-150) hover:bg-canvas-raised hover:text-on-canvas"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-bright transition-colors duration-(--dur-150) group-hover:bg-primary/25">
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{problem.label}</span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-on-canvas-subtle transition-transform duration-(--dur-150) group-hover:translate-x-0.5 group-hover:text-primary-bright" strokeWidth={2} />
                </LocaleLink>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
      <ul className="space-y-2.5 rounded-panel border border-line-canvas p-5">
        {BRAND.trustClaims.map((claim) => {
          const Icon = getIcon(claim.icon);
          return (
            <li key={claim.key} className="flex items-center gap-2.5 text-sm text-on-canvas-muted">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-primary-bright" strokeWidth={2} />
              {dictionary.home.hero.trust[claim.key]}
            </li>
          );
        })}
      </ul>
    </aside>
  );

  return (
    <TaskPage title={copy.header.title}>
      {/* key resets the finder when a new concern arrives from the home page form */}
      <SolutionFinder key={initialConcern} initialConcern={initialConcern} aside={aside} />
    </TaskPage>
  );
}
