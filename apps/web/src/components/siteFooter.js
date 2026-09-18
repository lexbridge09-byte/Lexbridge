import { getFooterGroups } from '@/brand';
import { BrandLogo } from '@/components/brandLogo';
import { LocaleLink } from '@/components/localeLink';
import { Container } from '@/components/ui';
import { getContactLinks } from '@/lib/publicContact';

function FooterLinkGroup({ title, links }) {
  return (
    <div>
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            {link.isExternal ? (
              <a href={link.href} className="text-sm font-medium text-ink-muted hover:text-primary">
                {link.label}
              </a>
            ) : (
              <LocaleLink href={link.href} className="text-sm font-medium text-ink-muted hover:text-primary">
                {link.label}
              </LocaleLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ dictionary }) {
  const common = dictionary.common;
  const groups = getFooterGroups(dictionary);
  const contactLinks = getContactLinks(dictionary);

  return (
    <footer className="border-t border-line bg-white print:hidden">
      <Container className="py-10 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_3fr]">
          <div className="max-w-xs">
            <BrandLogo />
            <p className="mt-4 text-sm leading-6 text-ink-muted">{common.brand.shortDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map((group) => (
              <FooterLinkGroup key={group.key} title={group.title} links={group.links} />
            ))}
            {contactLinks.length > 0 && <FooterLinkGroup title={common.footer.connect} links={contactLinks} />}
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs leading-5 text-ink-muted">
          <span className="font-semibold text-danger">{common.footer.disclaimerLabel}:</span> {common.brand.notLawFirmNotice}
        </p>
        <p className="mt-3 text-sm font-semibold text-ink">{common.footer.copyright(new Date().getFullYear())}</p>
      </Container>
    </footer>
  );
}
