'use client';

import { ExternalLink, Search, SearchX, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useDeferredValue, useId, useMemo, useState } from 'react';

// Searchable statute library: instant search + group chips, with a sticky group index on desktop
export function BareActsLibrary({ groups, acts, copy }) {
  const [query, setQuery] = useState('');
  const [groupKey, setGroupKey] = useState('all');
  const deferredQuery = useDeferredValue(query);
  const isReduced = useReducedMotion();
  const baseId = useId();
  const needle = deferredQuery.trim().toLocaleLowerCase();

  const visibleActs = useMemo(
    () =>
      acts.filter(
        (act) =>
          (groupKey === 'all' || act.group === groupKey) &&
          (!needle || `${act.name} ${act.year} ${act.description}`.toLocaleLowerCase().includes(needle)),
      ),
    [acts, groupKey, needle],
  );
  const visibleGroups = groups.filter((group) => visibleActs.some((act) => act.group === group.key));

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      {/* Group index (desktop): jump-filter by area of law, with counts */}
      <nav aria-label={copy.searchLabel} className="hidden lg:sticky lg:top-24 lg:block">
        <ul className="space-y-0.5">
          {[{ key: 'all', label: copy.allGroups }, ...groups].map((group) => {
            const isActive = groupKey === group.key;
            const count = group.key === 'all' ? acts.length : acts.filter((act) => act.group === group.key).length;
            return (
              <li key={group.key}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setGroupKey(group.key)}
                  className={`relative flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm font-medium transition-colors duration-(--dur-150) ${isActive ? 'text-on-canvas' : 'text-on-canvas-muted hover:text-on-canvas'}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={isReduced ? undefined : `${baseId}-group`}
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-control bg-canvas-raised ring-1 ring-primary/30"
                    />
                  )}
                  {group.label}
                  <span className="tabular text-xs text-on-canvas-subtle">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">
        <div className="relative">
          <label htmlFor={`${baseId}-search`} className="sr-only">
            {copy.searchLabel}
          </label>
          <input
            id={`${baseId}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            className="peer block min-h-12 w-full rounded-card border border-line-canvas bg-canvas-alt py-3 pl-12 pr-12 text-base text-on-canvas placeholder:text-on-canvas-subtle transition-[border-color,box-shadow] duration-(--dur-150) hover:border-primary/50 focus:border-primary focus:shadow-glow focus:outline-none focus:ring-2 focus:ring-primary/40 [&::-webkit-search-cancel-button]:hidden"
          />
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-on-canvas-subtle peer-focus:text-primary-bright" strokeWidth={2} />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={copy.clear}
              className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-on-canvas-muted hover:bg-canvas-raised hover:text-on-canvas"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Group chips (phones/tablets) */}
        <div className="scroll-row -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {[{ key: 'all', label: copy.allGroups }, ...groups].map((group) => (
            <button
              key={group.key}
              type="button"
              aria-pressed={groupKey === group.key}
              onClick={() => setGroupKey(group.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-(--dur-150) ${groupKey === group.key ? 'bg-cta text-canvas' : 'text-on-canvas-muted ring-1 ring-inset ring-line-canvas'}`}
            >
              {group.label}
            </button>
          ))}
        </div>

        <p aria-live="polite" className="tabular mt-3 text-sm text-on-canvas-subtle">
          {(visibleActs.length === acts.length ? copy.countAll : copy.countSome).replace('{shown}', visibleActs.length).replace('{total}', acts.length)}
        </p>

        <div className="mt-4 space-y-8">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleGroups.map((group) => (
              <motion.section
                key={group.key}
                layout={!isReduced}
                initial={isReduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={isReduced ? undefined : { opacity: 0 }}
                aria-labelledby={`${baseId}-${group.key}`}
              >
                <div className="flex items-baseline justify-between gap-4 border-b border-line-canvas pb-2">
                  <h2 id={`${baseId}-${group.key}`} className="font-heading text-2xl font-bold text-on-canvas">
                    {group.label}
                  </h2>
                  <p className="hidden text-xs text-on-canvas-subtle sm:block">{group.description}</p>
                </div>
                <ul className="divide-y divide-line-canvas">
                  {visibleActs
                    .filter((act) => act.group === group.key)
                    .map((act) => (
                      <li key={act.key}>
                        <a
                          href={act.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group -mx-3 flex items-center gap-4 rounded-control px-3 py-3.5 transition-colors duration-(--dur-150) hover:bg-canvas-alt"
                        >
                          <span className="tabular w-12 shrink-0 font-brand text-lg font-bold text-primary-bright/80">{act.year}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-on-canvas transition-colors duration-(--dur-150) group-hover:text-white">{act.name}</span>
                            <span className="mt-0.5 block text-sm leading-6 text-on-canvas-muted">{act.description}</span>
                          </span>
                          <span className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-primary-bright opacity-70 transition-opacity duration-(--dur-150) group-hover:opacity-100 sm:inline-flex">
                            {copy.readLabel}
                            <ExternalLink aria-hidden="true" className="size-4" strokeWidth={2} />
                          </span>
                          <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-primary-bright sm:hidden" strokeWidth={2} />
                        </a>
                      </li>
                    ))}
                </ul>
              </motion.section>
            ))}
          </AnimatePresence>

          {visibleActs.length === 0 && (
            <div className="flex flex-col items-center rounded-card border border-dashed border-line-canvas px-6 py-10 text-center">
              <SearchX aria-hidden="true" className="size-8 text-on-canvas-subtle" strokeWidth={1.5} />
              <p className="mt-3 font-semibold text-on-canvas">{copy.emptyTitle}</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setGroupKey('all');
                }}
                className="mt-3 text-sm font-semibold text-primary-bright underline-offset-4 hover:underline"
              >
                {copy.clear}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
