'use client';

import { ArrowRight, MessageCircleQuestion } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui';

const EASE_OUT_SOFT = [0.23, 1, 0.32, 1];

// Home FAQ as a question explorer: numbered questions on the left (a tab list), one large answer
// panel on the right. The active marker slides between questions; the answer cross-fades in place.
export function FaqExplorer({ items, copy, contactLabel }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef([]);
  const baseId = useId();
  const isReduced = useReducedMotion();
  const activeItem = items[activeIndex];

  // Arrow keys move between questions (WAI-ARIA tabs pattern, vertical on desktop)
  function handleKeyDown(event) {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    let nextIndex = null;
    if (step) nextIndex = (activeIndex + step + items.length) % items.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-8">
      <div role="tablist" aria-orientation="vertical" aria-label={copy.title} onKeyDown={handleKeyDown} className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item, itemIndex) => {
          const isActive = itemIndex === activeIndex;
          return (
            <button
              key={item.id}
              ref={(element) => {
                tabRefs.current[itemIndex] = element;
              }}
              id={`${baseId}-tab-${itemIndex}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveIndex(itemIndex)}
              className={`group relative flex w-64 shrink-0 items-start gap-4 rounded-card px-4 py-3.5 text-left transition-colors duration-(--dur-150) lg:w-auto ${isActive ? 'text-on-canvas' : 'text-on-canvas-muted hover:bg-canvas-alt hover:text-on-canvas'}`}
            >
              {isActive && (
                <motion.span
                  layoutId={isReduced ? undefined : `${baseId}-marker`}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-card border border-primary/40 bg-canvas-raised shadow-card"
                />
              )}
              <span
                aria-hidden="true"
                className={`tabular pt-0.5 font-brand text-lg font-bold leading-none transition-colors duration-(--dur-150) ${isActive ? 'text-primary-bright' : 'text-on-canvas-subtle group-hover:text-primary/80'}`}
              >
                {String(itemIndex + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold leading-6">{item.question}</span>
              <ArrowRight
                aria-hidden="true"
                className={`mt-1 hidden size-4 shrink-0 transition-[transform,opacity] duration-(--dur-200) ease-(--ease-out-soft) lg:block ${isActive ? 'translate-x-0 text-primary-bright opacity-100' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60'}`}
                strokeWidth={2}
              />
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
        className="relative flex min-h-80 flex-col overflow-hidden rounded-panel border border-line-canvas bg-hero p-6 sm:p-8"
      >
        <div aria-hidden="true" className="absolute -right-20 -top-20 -z-10 size-64 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.22),transparent)]" />
        {/* Oversized number echoes the selected question */}
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-4 select-none font-brand text-[9rem] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgb(200_143_108/0.22)]">
          {String(activeIndex + 1).padStart(2, '0')}
        </span>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeItem.id}
            initial={isReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isReduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
            className="flex-1"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-bright">{copy.answerLabel}</p>
            <h3 className="mt-3 font-heading text-2xl font-bold leading-tight text-on-canvas sm:text-3xl">{activeItem.question}</h3>
            <p className="mt-4 max-w-prose text-base leading-7 text-on-canvas-muted">{activeItem.answer}</p>
          </motion.div>
        </AnimatePresence>

        <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card border border-line-canvas bg-canvas/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-bright ring-1 ring-primary/30">
              <MessageCircleQuestion aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-semibold text-on-canvas">{copy.helpTitle}</p>
              <p className="text-xs leading-5 text-on-canvas-muted">{copy.helpBody}</p>
            </div>
          </div>
          <ButtonLink href="/contact" variant="onDarkBronze" size="sm">
            {contactLabel}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
