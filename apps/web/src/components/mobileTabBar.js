'use client';

import { BookOpen, CircleUserRound, House, Info, MessageSquareText, Scale, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { stripLocale } from '@/brand/locales';
import { LocaleLink } from '@/components/localeLink';
import { hasMobileTabBar } from '@/lib/chromeRoutes';

const TAB_ICONS = {
  home: House,
  services: Scale,
  consult: MessageSquareText,
  insights: BookOpen,
  ask: Sparkles,
  about: Info,
  account: CircleUserRound,
};

function isTabActive(tab, pathWithoutLocale) {
  if (tab.isExact) return pathWithoutLocale === tab.href;
  return pathWithoutLocale === tab.href || pathWithoutLocale.startsWith(`${tab.href}/`);
}

export function MobileTabBar({ tabs, label }) {
  const pathname = usePathname() ?? '/';
  if (!hasMobileTabBar(pathname)) return null;
  const pathWithoutLocale = stripLocale(pathname);

  return (
    <>
      <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-safe backdrop-blur-md lg:hidden print:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.icon] ?? House;
            const isActive = isTabActive(tab, pathWithoutLocale);
            return (
              <li key={tab.key}>
                <LocaleLink
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-ink-muted hover:text-ink'}`}
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                  {tab.label}
                </LocaleLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
