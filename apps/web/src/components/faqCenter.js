'use client';

import { ArrowRight, Plus, Search, SearchX, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import { ButtonLink } from '@/components/ui';

const EASE_OUT_SOFT = [0.23, 1, 0.32, 1];

function normalizeText(text) {
  return text.toLocaleLowerCase().normalize('NFKD');
}

// FAQ help centre: instant search + topic filter over numbered, expandable question cards
export function FaqCenter({ items, copy }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [openId, setOpenId] = useState(items[0]?.id ?? null);
  const deferredQuery = useDeferredValue(query);
  const isReduced = useReducedMotion();
  const baseId = useId();

  const topics = useMemo(() => Object.keys(copy.topics).filter((key) => items.some((item) => item.topic === key)), [copy.topics, items]);

  const visibleItems = useMemo(() => {
    const needle = normalizeText(deferredQuery.trim());
    return items.filter(
      (item) =>
        (topic === 'all' || item.topic === topic) && (!needle || normalizeText(`${item.question} ${item.answer}`).includes(needle)),
    );
  }, [items, topic, deferredQuery]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
      <div className="min-w-0">
        {/* Search + topic chips */}
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
            className="peer block min-h-13 w-full rounded-card border border-line-canvas bg-canvas-alt py-3 pl-12 pr-12 text-base text-on-canvas placeholder:text-on-canvas-subtle transition-[border-color,box-shadow] duration-(--dur-150) hover:border-primary/50 focus:border-primary focus:shadow-glow focus:outline-none focus:ring-2 focus:ring-primary/40 [&::-webkit-search-cancel-button]:hidden"
          />
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-on-canvas-subtle transition-colors duration-(--dur-150) peer-focus:text-primary-bright" strokeWidth={2} />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={copy.clear}
              className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-on-canvas-muted transition-colors duration-(--dur-150) hover:bg-canvas-raised hover:text-on-canvas active:scale-(--press-scale)"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={copy.searchLabel} className="flex flex-wrap gap-2">
            {['all', ...topics].map((key) => {
              const isActive = topic === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setTopic(key)}
                  className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-(--dur-150) active:scale-(--press-scale) ${isActive ? 'text-canvas' : 'text-on-canvas-muted ring-1 ring-inset ring-line-canvas hover:text-on-canvas hover:ring-primary/50'}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={isReduced ? undefined : `${baseId}-chip`}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-full bg-cta"
                    />
                  )}
                  <span className="relative">{key === 'all' ? copy.allTopics : copy.topics[key]}</span>
                </button>
              );
            })}
          </div>
          <p aria-live="polite" className="tabular text-sm text-on-canvas-subtle">
            {(visibleItems.length === items.length ? copy.countAll : copy.countSome)
              .replace('{shown}', visibleItems.length)
              .replace('{total}', items.length)}
          </p>
        </div>

        {/* Questions */}
        <ul className="mt-6 space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleItems.map((item) => {
              const isOpen = openId === item.id;
              const number = String(items.indexOf(item) + 1).padStart(2, '0');
              return (
                <motion.li
                  key={item.id}
                  layout={!isReduced}
                  initial={isReduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={isReduced ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
                  className={`group overflow-hidden rounded-card border transition-[border-color,background-color,box-shadow] duration-(--dur-200) ${isOpen ? 'border-primary/45 bg-canvas-raised shadow-card' : 'border-line-canvas bg-canvas-alt hover:border-primary/35'}`}
                >
                  <h2>
                    <button
                      type="button"
                      id={`${baseId}-q-${item.id}`}
                      aria-expanded={isOpen}
                      aria-controls={`${baseId}-a-${item.id}`}
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left"
                    >
                      <span aria-hidden="true" className={`tabular font-brand text-xl font-bold leading-none transition-colors duration-(--dur-150) ${isOpen ? 'text-primary-bright' : 'text-on-canvas-subtle group-hover:text-primary/80'}`}>
                        {number}
                      </span>
                      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-6 text-on-canvas sm:text-base">{item.question}</span>
                      <span
                        aria-hidden="true"
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,border-color,color] duration-(--dur-300) ease-(--ease-out-soft) motion-reduce:transition-none ${isOpen ? 'rotate-45 border-primary bg-primary text-canvas' : 'border-line-canvas text-primary-bright group-hover:border-primary/50'}`}
                      >
                        <Plus className="size-4" strokeWidth={2.25} />
                      </span>
                    </button>
                  </h2>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`${baseId}-a-${item.id}`}
                        role="region"
                        aria-labelledby={`${baseId}-q-${item.id}`}
                        initial={isReduced ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={isReduced ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE_OUT_SOFT }}
                      >
                        <p className="max-w-prose pb-5 pl-[3.75rem] pr-5 text-[15px] leading-7 text-on-canvas-muted">{item.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {visibleItems.length === 0 && (
          <motion.div
            initial={isReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center rounded-card border border-dashed border-line-canvas px-6 py-10 text-center"
          >
            <SearchX aria-hidden="true" className="size-8 text-on-canvas-subtle" strokeWidth={1.5} />
            <p className="mt-3 font-semibold text-on-canvas">{copy.emptyTitle}</p>
            <p className="mt-1 text-sm text-on-canvas-muted">{copy.emptyBody}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setTopic('all');
              }}
              className="mt-4 text-sm font-semibold text-primary-bright underline-offset-4 hover:underline"
            >
              {copy.clear}
            </button>
          </motion.div>
        )}
      </div>

      {/* Human route, always in reach */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="relative overflow-hidden rounded-panel border border-primary/25 bg-hero p-6">
          <div aria-hidden="true" className="absolute -right-12 -top-16 -z-10 size-48 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.3),transparent)]" />
          <p className="font-heading text-2xl font-bold leading-tight text-on-canvas">{copy.askTitle}</p>
          <p className="mt-2 text-sm leading-6 text-on-canvas-muted">{copy.askBody}</p>
          <ButtonLink href="/contact" isFullWidth className="group mt-5">
            {copy.askCta}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-(--dur-150) group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2} />
          </ButtonLink>
        </div>
      </aside>
    </div>
  );
}
