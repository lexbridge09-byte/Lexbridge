'use client';

import { usePathname } from 'next/navigation';
import { stripLocale } from '@/brand/locales';
import { LocaleLink } from '@/components/localeLink';

// Side navigation (dashboard) or tab strip (admin). Hrefs are locale-free; `exact` links only match their own path.
export function SectionNav({ label, links, orientation = 'vertical', footer }) {
  const pathWithoutLocale = stripLocale(usePathname() ?? '/');

  function isActive(link) {
    return link.exact
      ? pathWithoutLocale === link.href
      : pathWithoutLocale === link.href || pathWithoutLocale.startsWith(`${link.href}/`);
  }

  if (orientation === 'horizontal') {
    return (
      <nav aria-label={label} className="border-b border-line bg-white">
        <ul className="mx-auto flex max-w-site items-stretch gap-1 overflow-x-auto px-4 sm:px-6">
          {links.map((link) => {
            const isCurrent = isActive(link);
            return (
              <li key={link.href} className="flex">
                <LocaleLink
                  href={link.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`flex items-center whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold ${isCurrent ? 'border-primary text-primary-dark' : 'border-transparent text-ink-muted hover:text-ink'}`}
                >
                  {link.label}
                </LocaleLink>
              </li>
            );
          })}
          {footer && <li className="ml-auto flex items-center pl-4">{footer}</li>}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={label} className="mb-5 lg:mb-0">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:gap-1 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-2 lg:shadow-sm">
        {links.map((link) => {
          const isCurrent = isActive(link);
          return (
            <li key={link.href} className="shrink-0">
              <LocaleLink
                href={link.href}
                aria-current={isCurrent ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold lg:rounded-xl lg:px-3 lg:py-2.5 ${isCurrent ? 'bg-primary text-white lg:bg-primary-50 lg:text-primary-dark' : 'bg-surface-alt text-ink-muted hover:text-ink lg:bg-transparent lg:hover:bg-surface-alt'}`}
              >
                {link.label}
              </LocaleLink>
            </li>
          );
        })}
        {footer && <li className="shrink-0 lg:mt-1 lg:border-t lg:border-line lg:pt-1">{footer}</li>}
      </ul>
    </nav>
  );
}
