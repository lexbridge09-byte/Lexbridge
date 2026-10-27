import { ArrowRight, Check, ChevronRight, Sparkles } from 'lucide-react';
import { createElement } from 'react';
import { notFound } from 'next/navigation';
import {
  BRAND,
  deriveServiceActionHref,
  deriveServiceHref,
  getDictionary,
  getServerFeatures,
  SERVICE_DISPLAY_ORDER,
} from '@/brand';
import { LocaleLink } from '@/components/localeLink';
import { ButtonLink, Container, Reveal, Stagger, StaggerItem } from '@/components/ui';
import { getIcon, getServiceIcon } from '@/lib/icons';

export async function generateMetadata({ params }) {
  const { lang, key } = await params;
  const service = getDictionary(lang).services.items[key];
  return service ? { title: service.title, description: service.intro } : {};
}

/*
  Service page for one area of law: what it covers, the common situations, how it works, and one
  sticky action card. Menus, cards and search all land here first; the form is this page's action.
*/
export default async function ServiceAreaPage({ params, searchParams }) {
  const { lang, key } = await params;
  const { problem } = await searchParams;
  if (!SERVICE_DISPLAY_ORDER.includes(key)) notFound();
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const servicesCopy = dictionary.services;
  const copy = servicesCopy.area;
  const service = servicesCopy.items[key];
  if (!service) notFound();

  // Situations that belong to this area (from the brand's situation map)
  const problemIds = BRAND.situations.filter((situation) => situation.serviceKey === key).flatMap((situation) => situation.problemIds);
  const problems = problemIds.map((problemId) => ({
    id: problemId,
    icon: BRAND.problemShortcuts.find((shortcut) => shortcut.id === problemId)?.icon,
    ...dictionary.ux.problems.items[problemId],
  }));
  const selectedProblem = problems.find((item) => item.id === problem);
  const actionHref = deriveServiceActionHref(key, features);
  const describeHref = features.solutionFinder
    ? `/find-my-solution${selectedProblem?.concern ? `?concern=${encodeURIComponent(selectedProblem.concern)}` : ''}`
    : null;
  const relatedKeys = SERVICE_DISPLAY_ORDER.filter((otherKey) => otherKey !== key);

  return (
    <Container size="wide" className="py-8 lg:py-10">
      <nav aria-label={dictionary.common.nav.breadcrumbLabel} className="mb-5">
        <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-on-canvas-subtle">
          <li>
            <LocaleLink href="/services" className="transition-colors duration-(--dur-150) hover:text-primary-bright">
              {copy.allServices}
            </LocaleLink>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3" strokeWidth={2} />
          </li>
          <li aria-current="page" className="text-on-canvas-muted">
            {service.title}
          </li>
        </ol>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="min-w-0 space-y-6">
          {/* Overview: icon, title, intro and everything the service covers */}
          <Reveal as="section" className="relative overflow-hidden rounded-panel border border-primary/25 bg-hero p-6 sm:p-8">
            <div aria-hidden="true" className="absolute -right-20 -top-20 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.22),transparent)]" />
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary-bright ring-1 ring-primary/30">
              {createElement(getServiceIcon(key), { 'aria-hidden': true, className: 'size-7', strokeWidth: 1.75 })}
            </span>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-tight text-on-canvas">{service.title}</h1>
            <p className="mt-2 max-w-2xl text-lg leading-8 text-on-canvas-muted">{service.intro}</p>

            <h2 className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-on-canvas-subtle">{copy.coveredTitle}</h2>
            <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {service.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] leading-6 text-on-canvas">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary-bright" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Common situations: picking one marks it in the action card and prefills "describe" */}
          {problems.length > 0 && (
            <section aria-labelledby="area-problems-title">
              <h2 id="area-problems-title" className="text-h4 text-on-canvas">
                {copy.problemsTitle}
              </h2>
              <Stagger gap={0.04} className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {problems.map((item) => {
                  const isSelected = item.id === selectedProblem?.id;
                  return (
                    <StaggerItem key={item.id}>
                      <LocaleLink
                        href={`/services/area/${key}?problem=${item.id}`}
                        scroll={false}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`group flex items-center gap-3 rounded-card border px-4 py-3 text-sm font-semibold transition-[border-color,background-color] duration-(--dur-150) ${isSelected ? 'border-primary bg-primary/10 text-on-canvas' : 'border-line-canvas bg-canvas-alt text-on-canvas-muted hover:border-primary/50 hover:text-on-canvas'}`}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-bright">
                          {createElement(getIcon(item.icon), { 'aria-hidden': true, className: 'size-4', strokeWidth: 1.75 })}
                        </span>
                        <span className="min-w-0 flex-1">{item.label}</span>
                        {isSelected ? (
                          <Check aria-hidden="true" className="size-4 text-primary-bright" strokeWidth={2.5} />
                        ) : (
                          <ChevronRight aria-hidden="true" className="size-4 text-on-canvas-subtle transition-transform duration-(--dur-150) group-hover:translate-x-0.5" strokeWidth={2} />
                        )}
                      </LocaleLink>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </section>
          )}

          {/* How it works: three compact numbered steps */}
          <section aria-labelledby="area-steps-title">
            <h2 id="area-steps-title" className="text-h4 text-on-canvas">
              {copy.stepsTitle}
            </h2>
            <ol className="mt-3 grid gap-4 sm:grid-cols-3">
              {dictionary.home.steps.items.map((step, stepIndex) => (
                <li key={step.title} className="relative rounded-card border border-line-canvas bg-canvas-alt p-4">
                  <span className="tabular font-brand text-2xl font-bold leading-none text-primary-bright">{String(stepIndex + 1).padStart(2, '0')}</span>
                  <p className="mt-2 text-sm font-semibold text-on-canvas">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-on-canvas-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Other services: quick hops without going back to the list */}
          <section aria-labelledby="area-related-title">
            <h2 id="area-related-title" className="text-h4 text-on-canvas">
              {copy.relatedTitle}
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {relatedKeys.map((otherKey) => (
                <li key={otherKey}>
                  <LocaleLink
                    href={deriveServiceHref(otherKey)}
                    className="group flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-on-canvas-muted transition-colors duration-(--dur-150) hover:bg-canvas-alt hover:text-on-canvas"
                  >
                    {createElement(getServiceIcon(otherKey), { 'aria-hidden': true, className: 'size-4 shrink-0 text-primary-bright', strokeWidth: 1.75 })}
                    <span className="min-w-0 flex-1 truncate">{servicesCopy.items[otherKey].title}</span>
                    <ArrowRight aria-hidden="true" className="size-3.5 opacity-0 transition-[opacity,transform] duration-(--dur-150) group-hover:translate-x-0.5 group-hover:opacity-100" strokeWidth={2} />
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Action card: the one next step, always in view */}
        <aside className="lg:sticky lg:top-24">
          <Reveal delay={0.1} className="rounded-panel border border-line-canvas bg-canvas-alt p-5">
            {selectedProblem && (
              <p className="mb-4 rounded-control bg-primary/10 px-3 py-2 text-sm text-on-canvas ring-1 ring-primary/30">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-primary-bright">{copy.selected}</span>
                {selectedProblem.label}
              </p>
            )}
            <ButtonLink href={actionHref} size="lg" isFullWidth className="group">
              {service.ctaLabel}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-(--dur-150) group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2} />
            </ButtonLink>
            {describeHref && (
              <ButtonLink href={describeHref} variant="ghostOnDark" isFullWidth className="mt-2.5">
                <Sparkles aria-hidden="true" className="size-4" strokeWidth={2} />
                {copy.describe}
              </ButtonLink>
            )}
            <p className="mt-3 text-center text-xs text-on-canvas-subtle">{copy.actionNote}</p>
            <ul className="mt-5 space-y-2.5 border-t border-line-canvas pt-4">
              {BRAND.trustClaims.map((claim) => (
                <li key={claim.key} className="flex items-center gap-2.5 text-sm text-on-canvas-muted">
                  {createElement(getIcon(claim.icon), { 'aria-hidden': true, className: 'size-4 shrink-0 text-primary-bright', strokeWidth: 2 })}
                  {dictionary.home.hero.trust[claim.key]}
                </li>
              ))}
            </ul>
          </Reveal>
        </aside>
      </div>
    </Container>
  );
}
