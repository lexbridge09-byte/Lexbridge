'use client';

import { createElement } from 'react';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brandLogo';
import { AccountMenu } from '@/components/accountMenu';
import { LocaleLink } from '@/components/localeLink';
import { useDictionary } from '@/brand/localeContext';
import { LocaleProvider } from '@/brand/localeProviders';
import { DEFAULT_LOCALE } from '@/brand/locales';
import { isOfficePath } from '@/lib/chromeRoutes';

/*
  Back-office chrome for /admin and /team: a minimal office header replaces the marketing
  header (no Services / Talk to a lawyer / promos), so staff never see visitor navigation
  inside the workspace.
*/
export function OfficeHeader() {
  const pathname = usePathname() ?? '/';
  if (!isOfficePath(pathname)) return null;
  return (
    // The back office speaks English regardless of the site language — staff tooling, one voice
    <EnglishLocaleOverride>
      <header className="site-header sticky top-0 z-40 border-b border-line-canvas bg-canvas-alt/95 backdrop-blur-md print:static">
        <div className="mx-auto flex h-16 w-full max-w-site items-center gap-3 px-4 sm:px-6">
          <LocaleLink href="/" aria-label="LexBridge home" className="rounded-lg">
            <BrandLogo />
          </LocaleLink>
          <div className="ml-auto flex items-center gap-2">
            <AccountMenu signInHref="/login" signInLabel="Sign in" />
          </div>
        </div>
      </header>
    </EnglishLocaleOverride>
  );
}

// Hides marketing chrome (site header, footer, promos, sticky bars) inside the office area
export function HideOnOffice({ children }) {
  const pathname = usePathname() ?? '/';
  if (isOfficePath(pathname)) return null;
  return children;
}

// Forces the English dictionary for everything rendered inside the office area
export function EnglishLocaleOverride({ children }) {
  return createElement(LocaleProvider, { locale: DEFAULT_LOCALE }, children);
}
