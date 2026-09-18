import { ChevronRight } from 'lucide-react';
import { LocaleLink } from '@/components/localeLink';
import { Container } from '@/components/ui';
import { getIcon } from '@/lib/icons';

// One-line problem cards right under the hero: recognise your situation instead of naming a legal service
export function ProblemShortcuts({ title, problems }) {
  return (
    <section aria-labelledby="problems-title" className="border-b border-line bg-white">
      <Container className="py-5 lg:py-7">
        <h2 id="problems-title" className="text-sm font-semibold text-ink-muted">
          {title}
        </h2>
        {/* Phones: one swipeable row with edge fades; desktop: a 3-column grid */}
        <ul className="scroll-row -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
          {problems.map((problem) => {
            const Icon = getIcon(problem.icon);
            return (
              <li key={problem.id} className="w-60 shrink-0 snap-start lg:w-auto">
                <LocaleLink
                  href={problem.href}
                  className="group flex h-full min-h-12 items-center gap-3 rounded-control border border-line bg-white px-3.5 py-3 text-sm font-semibold text-ink transition-colors duration-(--dur-150) ease-(--ease-out-soft) hover:border-primary-100 hover:bg-primary-50"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary transition-colors duration-(--dur-150) group-hover:bg-white">
                    <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{problem.label}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-subtle transition-transform duration-(--dur-150) group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                    strokeWidth={2}
                  />
                </LocaleLink>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
