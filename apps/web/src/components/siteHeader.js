import { getAccountLink, getPrimaryCta, getPrimaryNav, getServerFeatures } from '@/brand';
import { AccountMenu } from '@/components/accountMenu';
import { BrandLogo } from '@/components/brandLogo';
import { CallbackRequestButton } from '@/components/callbackRequestButton';
import { LanguageSwitcher } from '@/components/languageSwitcher';
import { LocaleLink } from '@/components/localeLink';
import { MobileMenu } from '@/components/mobileMenu';
import { ServicesMenu } from '@/components/servicesMenu';
import { NavigationDisclosure } from '@/components/navigationDisclosure';
import { ButtonLink } from '@/components/ui';

// Natural widths avoid clipping the right-hand actions at intermediate desktop sizes.
const NAV_LINK_CLASS =
  'flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium text-on-canvas/85 transition-colors duration-(--dur-150) hover:bg-canvas-raised hover:text-on-canvas active:bg-canvas-raised';

// Services: two-pane menu (categories | services) that grows with the catalogue
function MegaMenu({ item, common, locale, describeHref, reviewHref }) {
  return (
    <li>
      <NavigationDisclosure label={item.label} triggerClassName={NAV_LINK_CLASS} isWide>
        <ServicesMenu groups={item.mega} copy={common.nav} locale={locale} describeHref={describeHref} reviewHref={reviewHref} />
      </NavigationDisclosure>
    </li>
  );
}

// Help: a small dropdown anchored to its trigger
function Dropdown({ item, common }) {
  return (
    <li>
      <NavigationDisclosure label={item.label} triggerClassName={NAV_LINK_CLASS}>
        <ul aria-label={common.nav.helpMenuLabel} className="scroll-soft max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-card border border-line-canvas bg-canvas-alt p-1.5 shadow-float">
          {item.children.map((child) => (
            <li key={child.key}>
              <LocaleLink
                href={child.href}
                className="flex min-h-10 items-center rounded-control px-3 py-2 text-sm font-medium text-on-canvas-muted transition-colors duration-(--dur-150) hover:bg-canvas-raised hover:text-on-canvas focus-visible:bg-canvas-raised active:bg-canvas-raised"
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
      {/* Full-width bar: logo in the left corner, actions in the right corner */}
      <div className="flex h-16 w-full items-center gap-2 px-4 sm:px-6 lg:px-8">
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
              if (item.mega) return <MegaMenu key={item.key} item={item} common={common} locale={locale} describeHref={features.solutionFinder ? '/find-my-solution' : null} reviewHref={features.aiDocumentReview ? '/document-review' : null} />;
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
            <LanguageSwitcher label={common.language.label} isCompact />
          </div>
          {features.callbackRequests && <CallbackRequestButton variant="header" />}
          {accountLink && <AccountMenu signInHref={accountLink.href} signInLabel={accountLink.label} />}
          <div className="hidden lg:block">
            <ButtonLink href={primaryCta.href} size="sm" className="whitespace-nowrap">
              {primaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
