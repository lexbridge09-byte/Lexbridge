'use client';

import { ArrowLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useDictionary } from '@/brand/localeContext';
import { AccountMenu } from '@/components/accountMenu';
import { BrandLogo } from '@/components/brandLogo';
import { useIsFeatureEnabled } from '@/components/featuresProvider';
import { LanguageSwitcher } from '@/components/languageSwitcher';
import { LocaleLink } from '@/components/localeLink';
import { isFocusedTaskPath, isLoginPath, isToolPath } from '@/lib/chromeRoutes';

// Hides marketing extras (footer call-to-action band, wordmark) on tool pages
export function HideOnTool({ children }) {
  return isToolPath(usePathname()) ? null : children;
}

export function HideOnTask({ children }) {
  return isFocusedTaskPath(usePathname()) ? null : children;
}

export function TaskHeader() {
  const pathname = usePathname();
  const { common } = useDictionary();
  const isAccountsEnabled = useIsFeatureEnabled('clientAccounts');
  if (!isFocusedTaskPath(pathname)) return null;
  return (
    <header className="border-b border-line-canvas bg-canvas">
      <div className="flex min-h-16 w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        <LocaleLink href="/" aria-label={common.homeLinkLabel} className="shrink-0 rounded-control"><BrandLogo isCompact /></LocaleLink>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher label={common.language.label} />
          {isAccountsEnabled && !isLoginPath(pathname) && <AccountMenu signInHref="/login" signInLabel={common.account.signIn} />}
        </div>
      </div>
      <nav aria-label={common.nav.servicesMenuLabel} className="mx-auto max-w-5xl px-4 pb-3 sm:px-6">
        <LocaleLink href="/services" className="inline-flex min-h-9 items-center gap-2 rounded-control text-sm text-on-canvas-muted hover:text-on-canvas">
          <ArrowLeft aria-hidden="true" className="size-4" />{common.nav.allServices}
        </LocaleLink>
      </nav>
    </header>
  );
}

export function TaskFooter() {
  const pathname = usePathname();
  const { common, legal } = useDictionary();
  if (!isFocusedTaskPath(pathname)) return null;
  return (
    <footer className="border-t border-line-canvas bg-canvas py-5">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <nav aria-label={common.nav.helpMenuLabel} className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-canvas-muted">
          <LocaleLink href="/faq" className="min-h-9 py-2 hover:text-on-canvas">{common.nav.faq}</LocaleLink>
          <LocaleLink href="/contact" className="min-h-9 py-2 hover:text-on-canvas">{common.nav.contact}</LocaleLink>
          <LocaleLink href="/legal/privacy" className="min-h-9 py-2 hover:text-on-canvas">{legal.pages.privacy.title}</LocaleLink>
          <LocaleLink href="/legal/terms" className="min-h-9 py-2 hover:text-on-canvas">{legal.pages.terms.title}</LocaleLink>
        </nav>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-on-canvas-muted">{common.brand.notLawFirmNotice}</p>
      </div>
    </footer>
  );
}
