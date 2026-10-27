'use client';

import { ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useDictionary, useLocalizedHref } from '@/brand/localeContext';
import { useIsFeatureEnabled } from '@/components/featuresProvider';
import { deriveOverlayPlacement } from '@/lib/overlayPosition';

const RESULT_LIMIT = 6;

function normalize(text) {
  return String(text ?? '').toLocaleLowerCase().normalize('NFKC');
}

// Every word of the query must appear somewhere; title matches rank first
function findMatches(items, query) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items.filter((item) => item.kind === 'problem').slice(0, RESULT_LIMIT);
  return items
    .map((item, itemIndex) => {
      const title = normalize(item.title);
      const haystack = `${title} ${normalize(item.keywords)}`;
      if (!tokens.every((token) => haystack.includes(token))) return null;
      const score = tokens.reduce((total, token) => total + (title.startsWith(token) ? 3 : title.includes(token) ? 2 : 1), 0);
      return { item, score, itemIndex };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.itemIndex - b.itemIndex)
    .slice(0, RESULT_LIMIT)
    .map((match) => match.item);
}

// ARIA combobox with instant client-side filtering; the last option always hands the text to the solution finder
export function ServiceSearch({ items, className = '' }) {
  const router = useRouter();
  const toLocalized = useLocalizedHref();
  const copy = useDictionary().ux.search;
  const isFinderEnabled = useIsFeatureEnabled('solutionFinder');
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState({ isAbove: false, maxHeight: 320 });
  const inputRef = useRef(null);
  const listboxRef = useRef(null);
  const baseId = useId().replace(/:/g, '');
  const listboxId = `${baseId}-listbox`;

  const trimmedQuery = query.trim();
  const matches = useMemo(() => findMatches(items, trimmedQuery), [items, trimmedQuery]);
  const options = trimmedQuery
    ? [
        ...matches,
        {
          id: 'describe',
          kind: 'describe',
          title: copy.describe(trimmedQuery),
          href: isFinderEnabled ? `/find-my-solution?concern=${encodeURIComponent(trimmedQuery)}` : '/contact',
        },
      ]
    : matches;
  const isExpanded = isOpen && options.length > 0;

  useEffect(() => {
    if (!isExpanded) return undefined;
    function updatePlacement() {
      if (!inputRef.current) return;
      const { top, bottom } = inputRef.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const next = deriveOverlayPlacement({ top, bottom, viewportTop: viewport?.offsetTop ?? 0, viewportHeight: viewport?.height ?? window.innerHeight });
      setPlacement((current) => current.isAbove === next.isAbove && current.maxHeight === next.maxHeight ? current : next);
    }
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    window.visualViewport?.addEventListener('resize', updatePlacement);
    window.visualViewport?.addEventListener('scroll', updatePlacement);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
      window.visualViewport?.removeEventListener('resize', updatePlacement);
      window.visualViewport?.removeEventListener('scroll', updatePlacement);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && activeIndex >= 0) listboxRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isExpanded]);

  function choose(option) {
    setIsOpen(false);
    router.push(toLocalized(option.href));
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => options.length ? index < 0 ? (step > 0 ? 0 : options.length - 1) : (index + step + options.length) % options.length : -1);
    } else if (isExpanded && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[activeIndex] ?? (trimmedQuery ? options[0] : null);
      if (option) choose(option);
    } else if (event.key === 'Escape') {
      if (isOpen) setIsOpen(false);
      else setQuery('');
      setActiveIndex(-1);
    }
  }

  return (
    <div role="search" className={`relative min-w-0 ${isExpanded ? 'z-30' : ''} ${className}`}>
      <label htmlFor={`${baseId}-input`} className="sr-only">
        {copy.label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-on-canvas-muted" strokeWidth={2} />
        <input
          ref={inputRef}
          id={`${baseId}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isExpanded}
          aria-controls={listboxId}
          aria-activedescendant={isExpanded && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined}
          value={query}
          placeholder={copy.placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => { setIsOpen(false); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          className="control-glass block min-h-12 w-full min-w-0 rounded-control py-3 pl-12 pr-4 text-base placeholder:text-on-canvas-muted transition-colors duration-(--dur-150) hover:border-primary/60 focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        />
      </div>

      {isExpanded && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={trimmedQuery ? copy.results(matches.length) : copy.suggestions}
          style={{ maxHeight: placement.maxHeight }}
          className={`absolute inset-x-0 z-40 overflow-y-auto overscroll-contain rounded-card border border-line bg-card p-2 text-ink shadow-raised ${placement.isAbove ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'}`}
        >
          {!trimmedQuery && <li role="presentation" className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-muted">{copy.suggestions}</li>}
          {options.map((option, optionIndex) => {
            const isActive = optionIndex === activeIndex;
            return (
              <li
                key={option.id}
                id={`${baseId}-option-${optionIndex}`}
                role="option"
                aria-selected={isActive}
                // Keep focus in the input so blur doesn't close the list before the click lands
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setActiveIndex(optionIndex)}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-3 py-3 active:bg-primary-100 ${isActive ? 'bg-primary-50 ring-1 ring-inset ring-primary-100' : ''} ${option.kind === 'describe' ? 'mt-1 border-t border-line text-primary-dark' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold leading-5">{option.title}</span>
                  {option.subtitle && <span className="mt-0.5 block break-words text-xs leading-5 text-ink-muted">{option.subtitle}</span>}
                </span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary" strokeWidth={2} />
              </li>
            );
          })}
        </ul>
      )}
      <p aria-live="polite" className="sr-only">
        {isExpanded && trimmedQuery ? copy.results(matches.length) : ''}
      </p>
    </div>
  );
}
