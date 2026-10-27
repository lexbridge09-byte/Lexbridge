import { ChevronRight } from 'lucide-react';
import { getAccountLink, getPrimaryCta, getPrimaryNav, getServerFeatures } from '@/brand';
import { AccountMenu } from '@/components/accountMenu';
import { BrandLogo } from '@/components/brandLogo';
import { CallbackRequestButton } from '@/components/callbackRequestButton';
import { LanguageSwitcher } from '@/components/languageSwitcher';
import { LocaleLink } from '@/components/localeLink';
import { MobileMenu } from '@/components/mobileMenu';
import { NavigationDisclosure } from '@/components/navigationDisclosure';
import { ButtonLink } from '@/components/ui';
import { formatRupees } from '@/lib/formatValues';
import { getIcon } from '@/lib/icons';

// Natural widths avoid clipping the right-hand actions at intermediate desktop sizes.
const NAV_LINK_CLASS =
  'flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium text-on-canvas/85 transition-colors duration-(--dur-150) hover:bg-canvas-raised hover:text-on-canvas active:bg-canvas-raised';

// Services: a full-width panel grouped by life situation (opens on hover or keyboard focus)
function MegaMenu({ item, common, locale }) {
  return (
    <li>
      <NavigationDisclosure label={item.label} triggerClassName={NAV_LINK_CLASS} isWide>
        <div className="mx-auto max-w-site px-6">
          <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-panel border border-line bg-card p-6 shadow-raised">
            <p className="text-xs font-semibold text-ink-muted">{common.nav.megaTitle}</p>
            <ul aria-label={common.nav.servicesMenuLabel} className="mt-4 grid grid-cols-5 gap-6">
              {item.mega.map((group) => {
                const Icon = getIcon(group.icon);
                return (
                  <li key={group.key} className="min-w-0">
                    <LocaleLink
                      href={group.href}
                      className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink transition-colors duration-(--dur-150) hover:text-primary-dark"
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
                             <span className="min-w-0 break-words">{link.label}</span>
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
                className="group inline-flex items-center gap-1 text-sm font-semibold text-primary-dark"
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
      </NavigationDisclosure>
    </li>
  );
}

// Help: a small dropdown anchored to its trigger
function Dropdown({ item, common }) {
  return (
    <li>
      <NavigationDisclosure label={item.label} triggerClassName={NAV_LINK_CLASS}>
        <ul aria-label={common.nav.helpMenuLabel} className="max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-card border border-line bg-card p-2 shadow-raised">
          {item.children.map((child) => (
            <li key={child.key}>
              <LocaleLink
                href={child.href}
                className="flex min-h-11 items-center rounded-control px-3 py-2.5 text-sm font-medium text-ink transition-colors duration-(--dur-150) hover:bg-primary-50 hover:text-primary-dark focus-visible:bg-primary-50 active:bg-primary-100"
              >
                {child.label}
              </LocaleLink>
            </li>
          ))}
        </ul>
      </NavigationDisclosure>
    </li>
  );
}

export async function SiteHeader({ dictionary, locale }) {
  const common = dictionary.common;
  const features = await getServerFeatures();
  const navItems = getPrimaryNav(dictionary, [], features);
  const primaryCta = getPrimaryCta(dictionary, features);
  const accountLink = getAccountLink(dictionary, features);

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line-canvas bg-canvas-alt/95 backdrop-blur-md print:static">
      <div className="mx-auto flex h-16 w-full max-w-site items-center gap-2 px-4 sm:px-6">
        <MobileMenu
          navItems={navItems}
          accountLink={accountLink}
          primaryCta={primaryCta}
          copy={{ ...common.menu, navLabel: common.nav.mainLabel, languageLabel: common.language.label }}
        />

        <LocaleLink href="/" aria-label={common.homeLinkLabel} className="min-w-0 shrink-0 rounded-lg">
          <BrandLogo isCompact />
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
          <div className="hidden sm:block">
            <LanguageSwitcher label={common.language.label} />
          </div>
          {features.callbackRequests && <CallbackRequestButton variant="header" />}
          {accountLink && <AccountMenu signInHref={accountLink.href} signInLabel={accountLink.label} />}
          <div className="hidden 2xl:block">
            <ButtonLink href={primaryCta.href} size="sm" className="min-w-46 whitespace-nowrap">
              {primaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
