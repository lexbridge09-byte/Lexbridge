'use client';

import { ArrowRight, FileSearch, Search, Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { LocaleLink } from '@/components/localeLink';
import { formatRupees } from '@/lib/formatValues';
import { getIcon } from '@/lib/icons';

/*
  Two-pane services menu that scales with the catalogue: categories on the left (hover, focus or
  arrow keys pick one), that category's services on the right, and a search across everything on top.
  Adding a category adds one row on the left; the panel never needs more columns.
*/
export function ServicesMenu({ groups, copy, locale, describeHref, reviewHref }) {
  const [activeKey, setActiveKey] = useState(groups[0]?.key);
  const [query, setQuery] = useState('');
  const isReduced = useReducedMotion();
  const baseId = useId();
  const activeGroup = groups.find((group) => group.key === activeKey) ?? groups[0];
  const needle = query.trim().toLocaleLowerCase();

  // Search flattens every category's links into one list
  const matches = useMemo(() => {
    if (!needle) return [];
    return groups.flatMap((group) =>
      group.links.filter((link) => link.label.toLocaleLowerCase().includes(needle)).map((link) => ({ ...link, groupLabel: group.label, icon: group.icon })),
    );
  }, [groups, needle]);

  function handleCategoryKeys(event) {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = groups.findIndex((group) => group.key === activeGroup.key);
    const next = groups[(index + step + groups.length) % groups.length];
    setActiveKey(next.key);
    document.getElementById(`${baseId}-cat-${next.key}`)?.focus();
  }

  return (
    <div className="overflow-hidden rounded-panel border border-line-canvas bg-canvas-alt shadow-float">
      {/* Search across every service */}
      <div className="relative border-b border-line-canvas">
        <label htmlFor={`${baseId}-search`} className="sr-only">
          {copy.megaSearch}
        </label>
        <input
          id={`${baseId}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.megaSearch}
          autoComplete="off"
          className="peer block h-12 w-full bg-transparent pl-12 pr-4 text-sm text-on-canvas placeholder:text-on-canvas-subtle focus:bg-canvas-raised/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-on-canvas-subtle peer-focus:text-primary-bright" strokeWidth={2} />
      </div>

      {needle ? (
        <div className="scroll-soft max-h-[min(26rem,calc(100dvh-12rem))] overflow-y-auto p-3">
          {matches.length > 0 ? (
            <ul className="grid gap-1 sm:grid-cols-2">
              {matches.map((match) => {
                const Icon = getIcon(match.icon);
                return (
                  <li key={match.key}>
                    <LocaleLink href={match.href} className="group flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors duration-(--dur-150) hover:bg-canvas-raised">
                      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary-bright" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-on-canvas">{match.label}</span>
                        <span className="block truncate text-xs text-on-canvas-subtle">{match.groupLabel}</span>
                      </span>
                      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-on-canvas-subtle opacity-0 transition-[opacity,transform] duration-(--dur-150) group-hover:translate-x-0.5 group-hover:opacity-100" strokeWidth={2} />
                    </LocaleLink>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <p className="text-sm text-on-canvas-muted">{copy.megaEmpty}</p>
              {describeHref && (
                <LocaleLink href={`${describeHref}?concern=${encodeURIComponent(query.trim())}`} className="inline-flex items-center gap-2 rounded-control bg-cta px-4 py-2 text-sm font-semibold text-canvas">
                  <Sparkles aria-hidden="true" className="size-4" strokeWidth={2} />
                  {copy.megaDescribe}
                </LocaleLink>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[15rem_minmax(0,1fr)_16rem]">
          {/* Categories: one row each, so the list grows downward as services are added */}
          <ul
            role="tablist"
            aria-orientation="vertical"
            aria-label={copy.servicesMenuLabel}
            onKeyDown={handleCategoryKeys}
            className="scroll-soft max-h-[min(26rem,calc(100dvh-12rem))] space-y-0.5 overflow-y-auto border-r border-line-canvas p-2"
          >
            {groups.map((group) => {
              const Icon = getIcon(group.icon);
              const isActive = group.key === activeGroup.key;
              return (
                <li key={group.key} role="presentation">
                  <button
                    id={`${baseId}-cat-${group.key}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${baseId}-panel`}
                    tabIndex={isActive ? 0 : -1}
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'mouse') setActiveKey(group.key);
                    }}
                    onFocus={() => setActiveKey(group.key)}
                    onClick={() => setActiveKey(group.key)}
                    className={`relative flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-(--dur-150) ${isActive ? 'text-on-canvas' : 'text-on-canvas-muted hover:text-on-canvas'}`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={isReduced ? undefined : `${baseId}-active`}
                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-control bg-canvas-raised ring-1 ring-primary/30"
                      />
                    )}
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-(--dur-150) ${isActive ? 'bg-primary/20 text-primary-bright' : 'bg-canvas-raised text-on-canvas-subtle'}`}>
                      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Services in the selected category */}
          <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-cat-${activeGroup.key}`} className="relative min-h-72 p-6">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.16),transparent)]" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeGroup.key}
                initial={isReduced ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={isReduced ? undefined : { opacity: 0, x: -4 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="relative"
              >
                <p className="font-heading text-2xl font-bold text-on-canvas">{activeGroup.label}</p>
                <p className="mt-1 text-sm text-on-canvas-muted">{activeGroup.description}</p>
                <ul className="mt-5 grid gap-1 sm:grid-cols-2">
                  {activeGroup.links.map((link) => (
                    <li key={link.key}>
                      <LocaleLink
                        href={link.href}
                        className="group flex items-center gap-3 rounded-control border border-transparent px-2.5 py-2 text-sm font-medium text-on-canvas transition-[background-color,border-color] duration-(--dur-150) hover:border-line-canvas hover:bg-canvas-raised"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas-raised text-primary-bright ring-1 ring-line-canvas transition-colors duration-(--dur-150) group-hover:bg-primary/20 group-hover:ring-primary/30">
                          {(() => {
                            const LinkIcon = getIcon(link.icon ?? activeGroup.icon);
                            return <LinkIcon aria-hidden="true" className="size-4" strokeWidth={1.75} />;
                          })()}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{link.label}</span>
                        {Number.isFinite(link.pricePaise) ? (
                          <span className="tabular shrink-0 text-xs text-on-canvas-subtle">{formatRupees(link.pricePaise, locale)}</span>
                        ) : (
                          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-on-canvas-subtle opacity-0 transition-[opacity,transform] duration-(--dur-150) group-hover:translate-x-0.5 group-hover:text-primary-bright group-hover:opacity-100" strokeWidth={2} />
                        )}
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line-canvas pt-4">
                  <LocaleLink href={activeGroup.href} className="group inline-flex items-center gap-1 text-sm font-semibold text-primary-bright">
                    {copy.megaViewAll.replace('{label}', activeGroup.label)}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-(--dur-150) group-hover:translate-x-0.5" strokeWidth={2} />
                  </LocaleLink>
                  <LocaleLink href="/services" className="text-sm font-medium text-on-canvas-muted transition-colors duration-(--dur-150) hover:text-on-canvas">
                    {copy.allServices}
                  </LocaleLink>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Feature cards: the two high-value entry points that aren't a single service */}
          <div className="space-y-3 border-l border-line-canvas p-3">
            {reviewHref && (
              <LocaleLink href={reviewHref} className="group relative block overflow-hidden rounded-card border border-primary/25 bg-hero p-4 transition-[border-color,transform] duration-(--dur-200) hover:-translate-y-0.5 hover:border-primary/60 motion-reduce:hover:translate-y-0">
                <div aria-hidden="true" className="absolute -right-10 -top-10 size-32 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.3),transparent)]" />
                <span className="relative flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary-bright ring-1 ring-primary/30">
                  <FileSearch aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </span>
                <p className="relative mt-3 text-sm font-semibold text-on-canvas">{copy.megaReviewTitle}</p>
                <p className="relative mt-1 text-xs leading-5 text-on-canvas-muted">{copy.megaReviewBody}</p>
                <ArrowRight aria-hidden="true" className="relative mt-2 size-4 text-primary-bright transition-transform duration-(--dur-150) group-hover:translate-x-1" strokeWidth={2} />
              </LocaleLink>
            )}
            {describeHref && (
              <LocaleLink href={describeHref} className="group block rounded-card border border-dashed border-line-canvas p-4 transition-colors duration-(--dur-200) hover:border-primary/50">
                <span className="flex size-9 items-center justify-center rounded-lg bg-canvas-raised text-primary-bright ring-1 ring-line-canvas">
                  <Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </span>
                <p className="mt-3 text-sm font-semibold text-on-canvas">{copy.megaDescribe}</p>
                <p className="mt-1 text-xs leading-5 text-on-canvas-muted">{copy.megaDescribeBody}</p>
              </LocaleLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
