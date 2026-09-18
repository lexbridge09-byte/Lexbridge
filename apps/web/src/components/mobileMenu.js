'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/languageSwitcher';
import { LocaleLink } from '@/components/localeLink';
import { ButtonLink } from '@/components/ui';

// Native disclosure so it works before JavaScript loads; keying by path closes it after navigation
export function MobileMenu({ navItems, accountLink, primaryCta, copy }) {
  const pathname = usePathname();

  return (
    <details key={pathname} className="group xl:hidden">
      <summary className="-ml-2 flex size-11 cursor-pointer list-none items-center justify-center rounded-xl text-ink hover:bg-surface-alt [&::-webkit-details-marker]:hidden">
        <Menu aria-hidden="true" className="size-6 group-open:hidden" strokeWidth={1.75} />
        <X aria-hidden="true" className="hidden size-6 group-open:block" strokeWidth={1.75} />
        <span className="sr-only group-open:hidden">{copy.open}</span>
        <span className="sr-only hidden group-open:block">{copy.close}</span>
      </summary>

      <div className="absolute inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-white px-4 pb-6 pt-2 shadow-float sm:px-6">
        <nav aria-label={copy.navLabel}>
          <ul className="divide-y divide-line">
            {navItems.map((item) => (
              <li key={item.key} className="py-1">
                <LocaleLink href={item.href} className="block rounded-xl px-2 py-3 text-base font-semibold text-ink hover:bg-surface-alt">
                  {item.label}
                </LocaleLink>
                {item.children && (
                  <ul className="mb-2 grid grid-cols-2 gap-1 pl-2">
                    {item.children.map((child) => (
                      <li key={child.key}>
                        <LocaleLink
                          href={child.href}
                          className="block rounded-lg px-2 py-2 text-sm text-ink-muted hover:bg-primary-50 hover:text-primary-dark"
                        >
                          {child.label}
                        </LocaleLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {accountLink && (
              <li className="py-1">
                <LocaleLink href={accountLink.href} className="block rounded-xl px-2 py-3 text-base font-semibold text-ink hover:bg-surface-alt">
                  {accountLink.label}
                </LocaleLink>
              </li>
            )}
          </ul>
        </nav>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-alt px-3 py-2">
          <span className="text-sm font-semibold text-ink">{copy.languageLabel}</span>
          <LanguageSwitcher label={copy.languageLabel} className="bg-white" />
        </div>
        <ButtonLink href={primaryCta.href} isFullWidth className="mt-4">
          {primaryCta.label}
        </ButtonLink>
      </div>
    </details>
  );
}
