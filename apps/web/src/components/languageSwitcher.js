'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALE_COOKIE_NAME, LOCALE_LABELS, localizedHref, stripLocale, SUPPORTED_LOCALES } from '@/brand/locales';
import { useLocale } from '@/brand/localeContext';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Saved before navigating so proxy.js sends locale-less links to the chosen language next time
function rememberLocale(targetLocale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${targetLocale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

// Two options only, always visible (Hick's law): keeps the current page and remembers the choice
export function LanguageSwitcher({ label, surface = 'dark', className = '' }) {
  const locale = useLocale();
  const pathWithoutLocale = stripLocale(usePathname() ?? '/');

  return (
    <div role="group" aria-label={label} className={`inline-flex max-w-full shrink-0 items-center gap-0.5 rounded-control border p-1 ${surface === 'light' ? 'border-line bg-card-dim' : 'border-line-canvas bg-canvas-raised'} ${className}`}>
      {SUPPORTED_LOCALES.map((targetLocale) => {
        const isCurrent = targetLocale === locale;
        return (
          <Link
            key={targetLocale}
            href={localizedHref(targetLocale, pathWithoutLocale)}
            hrefLang={targetLocale}
            lang={targetLocale}
            aria-current={isCurrent ? 'true' : undefined}
            onClick={() => rememberLocale(targetLocale)}
            // Stay at the same place on the page when switching language
            scroll={false}
            className={`inline-flex min-h-9 min-w-14 items-center justify-center rounded-lg px-2.5 py-2 text-center text-xs font-semibold transition-colors duration-(--dur-150) ${isCurrent ? 'bg-card-hover text-ink shadow-sm' : surface === 'light' ? 'text-ink-muted hover:bg-card hover:text-ink' : 'text-on-canvas-muted hover:bg-canvas-alt hover:text-on-canvas'}`}
          >
            {LOCALE_LABELS[targetLocale]}
          </Link>
        );
      })}
    </div>
  );
}
