import { ChevronDown, ChevronRight } from 'lucide-react';
import { getAccountLink, getPrimaryCta, getPrimaryNav, isFeatureEnabled } from '@/brand';
import { AccountMenu } from '@/components/accountMenu';
import { BrandLogo } from '@/components/brandLogo';
import { CallbackRequestButton } from '@/components/callbackRequestButton';
import { LanguageSwitcher } from '@/components/languageSwitcher';
import { LocaleLink } from '@/components/localeLink';
import { MobileMenu } from '@/components/mobileMenu';
import { ButtonLink } from '@/components/ui';
import { formatRupees } from '@/lib/formatValues';
import { getIcon } from '@/lib/icons';

// Fixed minimum widths keep the header from shifting when the language (and label length) changes
const NAV_LINK_CLASS =
  'flex min-w-34 items-center justify-center gap-1 whitespace-nowrap rounded-control px-3 py-2 text-[15px] font-medium text-ink/85 transition-colors duration-(--dur-150) hover:bg-surface-alt hover:text-ink';

// Services: a full-width panel grouped by life situation (opens on hover or keyboard focus)
function MegaMenu({ item, common, locale }) {
  return (
    <li className="menu-trigger">
      <LocaleLink href={item.href} aria-haspopup="true" className={NAV_LINK_CLASS}>
        {item.label}
        <ChevronDown aria-hidden="true" className="menu-chevron size-4" strokeWidth={2} />
      </LocaleLink>
      <div className="menu-panel absolute inset-x-0 top-full z-50 pt-2">
        <div className="mx-auto max-w-site px-6">
          <div className="rounded-panel border border-line bg-white p-6 shadow-raised">
            <p className="text-xs font-semibold text-ink-muted">{common.nav.megaTitle}</p>
            <ul aria-label={common.nav.servicesMenuLabel} className="mt-4 grid grid-cols-5 gap-6">
              {item.mega.map((group) => {
                const Icon = getIcon(group.icon);
                return (
                  <li key={group.key} className="min-w-0">
                    <LocaleLink
                      href={group.href}
                      className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink transition-colors duration-(--dur-150) hover:text-primary"
                    >
                      <Icon aria-hidden="true" className="size-[18px] shrink-0 text-primary" strokeWidth={1.75} />
                      {group.label}
                    </LocaleLink>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">{group.description}</p>
                    <ul className="mt-3 space-y-0.5">
                      {group.links.map((link) => (
                        <li key={link.key}>
                          <LocaleLink
                            href={link.href}
                            className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ink/85 transition-colors duration-(--dur-150) hover:bg-primary-50 hover:text-primary-dark"
                          >
                            <span className="truncate">{link.label}</span>
                            {Number.isFinite(link.pricePaise) && (
                              <span className="tabular shrink-0 text-xs text-ink-muted">{formatRupees(link.pricePaise, locale)}</span>
                            )}
                          </LocaleLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 border-t border-line pt-4">
              <LocaleLink
                href="/services"
                className="group inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                {common.nav.allServices}
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-(--dur-150) group-hover:translate-x-0.5 motion-reduce:transition-none"
                  strokeWidth={2}
                />
              </LocaleLink>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// Help: a small dropdown anchored to its trigger
function Dropdown({ item, common }) {
  return (
    <li className="menu-trigger relative">
      <LocaleLink href={item.href} aria-haspopup="true" className={NAV_LINK_CLASS}>
        {item.label}
        <ChevronDown aria-hidden="true" className="menu-chevron size-4" strokeWidth={2} />
      </LocaleLink>
      <div className="menu-panel absolute left-0 top-full z-50 w-60 pt-2">
        <ul aria-label={common.nav.helpMenuLabel} className="rounded-card border border-line bg-white p-1.5 shadow-raised">
          {item.children.map((child) => (
            <li key={child.key}>
              <LocaleLink
                href={child.href}
                className="block rounded-control px-3 py-2.5 text-sm font-medium text-ink transition-colors duration-(--dur-150) hover:bg-primary-50 hover:text-primary-dark"
              >
                {child.label}
              </LocaleLink>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export function SiteHeader({ dictionary, locale }) {
  const common = dictionary.common;
  const navItems = getPrimaryNav(dictionary);
  const primaryCta = getPrimaryCta(dictionary);
  const accountLink = getAccountLink(dictionary);

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-white print:static">
      <div className="mx-auto flex h-16 w-full max-w-site items-center gap-2 px-4 sm:px-6">
        <MobileMenu
          navItems={navItems}
          accountLink={accountLink}
          primaryCta={primaryCta}
          copy={{ ...common.menu, navLabel: common.nav.mainLabel, languageLabel: common.language.label }}
        />

        <LocaleLink href="/" aria-label={common.homeLinkLabel} className="rounded-lg">
          <BrandLogo />
        </LocaleLink>

        <nav aria-label={common.nav.mainLabel} className="ml-4 hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {navItems.map((item) => {
              if (item.mega) return <MegaMenu key={item.key} item={item} common={common} locale={locale} />;
              if (item.children) return <Dropdown key={item.key} item={item} common={common} />;
              return (
                <li key={item.key}>
                  <LocaleLink href={item.href} className={NAV_LINK_CLASS}>
                    {item.label}
                  </LocaleLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <LanguageSwitcher label={common.language.label} className="hidden sm:inline-flex" />
          {isFeatureEnabled('callbackRequests') && <CallbackRequestButton variant="header" />}
          {accountLink && <AccountMenu signInHref={accountLink.href} signInLabel={accountLink.label} />}
          <ButtonLink href={primaryCta.href} size="sm" className="hidden min-w-46 whitespace-nowrap md:inline-flex">
            {primaryCta.label}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
