'use client';

import { ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary, useLocalizedHref } from '@/brand/localeContext';

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
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
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
          href: isFeatureEnabled('solutionFinder') ? `/find-my-solution?concern=${encodeURIComponent(trimmedQuery)}` : '/contact',
        },
      ]
    : matches;
  const isExpanded = isOpen && options.length > 0;

  function choose(option) {
    setIsOpen(false);
    router.push(toLocalized(option.href));
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (options.length ? (index + step + options.length) % options.length : -1));
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
    <div role="search" className={`relative ${className}`}>
      <label htmlFor={`${baseId}-input`} className="sr-only">
        {copy.label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" strokeWidth={2} />
        <input
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
          onBlur={() => setIsOpen(false)}
          onKeyDown={handleKeyDown}
          className="block h-12 w-full rounded-2xl border border-line-strong bg-white pl-12 pr-4 text-[15px] text-ink shadow-sm placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100"
        />
      </div>

      {isExpanded && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={trimmedQuery ? copy.results(matches.length) : copy.suggestions}
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 text-ink shadow-float"
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
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${isActive ? 'bg-primary-50' : ''} ${option.kind === 'describe' ? 'mt-1 border-t border-line text-primary-dark' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{option.title}</span>
                  {option.subtitle && <span className="block truncate text-xs text-ink-muted">{option.subtitle}</span>}
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
