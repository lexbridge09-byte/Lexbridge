import { ArrowUp, ArrowUpRight, Mail, Phone } from 'lucide-react';
import { getFooterGroups, getPrimaryCta, getServerFeatures } from '@/brand';
import { BrandLogo } from '@/components/brandLogo';
import { HideOnTool } from '@/components/taskChrome';
import { LocaleLink } from '@/components/localeLink';
import { ButtonLink, Container, Reveal } from '@/components/ui';
import { deriveTelHref, getContactLinks, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/publicContact';

// Underline grows from the left on hover; colour shifts to rose gold
const FOOTER_LINK_CLASS =
  'group/link relative inline-flex items-center gap-1 py-0.5 text-sm font-medium text-on-canvas-muted transition-colors duration-(--dur-150) hover:text-primary-bright after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-primary-bright/60 after:transition-transform after:duration-(--dur-200) after:ease-(--ease-out-soft) hover:after:scale-x-100 motion-reduce:after:transition-none';

function FooterLinkGroup({ title, links }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-on-canvas-subtle">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            {link.isExternal ? (
              <a href={link.href} className={FOOTER_LINK_CLASS}>
                {link.label}
                <ArrowUpRight aria-hidden="true" className="size-3.5 opacity-0 transition-[opacity,transform] duration-(--dur-150) group-hover/link:translate-x-0.5 group-hover/link:opacity-100" strokeWidth={2} />
              </a>
            ) : (
              <LocaleLink href={link.href} className={FOOTER_LINK_CLASS}>
                {link.label}
              </LocaleLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function SiteFooter({ dictionary }) {
  const common = dictionary.common;
  const features = await getServerFeatures();
  const groups = getFooterGroups(dictionary, features);
  // Phone and email are shown under the logo; the Connect column keeps the other channels
  const contactLinks = getContactLinks(dictionary).filter((link) => !/^(mailto|tel):/.test(link.href));
  const primaryCta = getPrimaryCta(dictionary, features);

  return (
    <footer className="relative isolate overflow-hidden bg-canvas-alt print:hidden">
      <div aria-hidden="true" className="divider-bronze" />

      <HideOnTool>
      {/* Closing call to action: one last, low-pressure route in */}
      <Container size="wide" className="pt-10 lg:pt-14">
        <Reveal className="relative overflow-hidden rounded-panel border border-primary/25 bg-hero p-6 sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:p-10">
          <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.28),transparent)]" />
          <div className="max-w-xl">
            <p className="text-section text-on-canvas">{common.footer.ctaTitle}</p>
            <p className="mt-2 leading-7 text-on-canvas-muted">{common.footer.ctaBody}</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
            <ButtonLink href={primaryCta.href} size="lg">
              {primaryCta.label}
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghostOnDark" size="lg">
              {common.cta.contact}
            </ButtonLink>
          </div>
        </Reveal>
      </Container>
      </HideOnTool>

      {/* Wide row: brand column plus link columns spread evenly across the full width */}
      <Container size="wide" className="py-10 lg:py-14">
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1.5fr)_repeat(3,minmax(0,1fr))] xl:gap-x-16">
          <div className="max-w-sm sm:col-span-2 lg:col-span-1">
            <BrandLogo />
            <p className="mt-3 font-brand text-lg italic text-primary-bright/90">{common.footer.tagline}</p>
            <p className="mt-3 text-sm leading-6 text-on-canvas-muted">{common.brand.shortDescription}</p>
            {/* Direct contact, shown as the actual number and address */}
            <ul className="mt-5 space-y-2">
              {[
                SUPPORT_PHONE && { href: deriveTelHref(SUPPORT_PHONE), icon: Phone, text: SUPPORT_PHONE },
                SUPPORT_EMAIL && { href: `mailto:${SUPPORT_EMAIL}`, icon: Mail, text: SUPPORT_EMAIL },
              ]
                .filter(Boolean)
                .map(({ href, icon: Icon, text }) => (
                  <li key={href}>
                    <a href={href} className="group inline-flex items-center gap-2.5 text-sm font-medium text-on-canvas transition-colors duration-(--dur-150) hover:text-primary-bright">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary-bright ring-1 ring-primary/30 transition-colors duration-(--dur-150) group-hover:bg-primary/25">
                        <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="tabular break-all">{text}</span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
          {groups.map((group) => (
            <FooterLinkGroup key={group.key} title={group.title} links={group.links} />
          ))}
          {contactLinks.length > 0 && <FooterLinkGroup title={common.footer.connect} links={contactLinks} />}
        </div>

        <p className="mt-10 border-t border-line-canvas pt-6 text-xs leading-5 text-on-canvas-subtle">
          <span className="font-semibold text-on-canvas-muted">{common.footer.disclaimerLabel}:</span> {common.brand.notLawFirmNotice}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="font-semibold text-on-canvas">
            {common.footer.copyright(new Date().getFullYear())}
            <span className="ml-2 font-normal text-on-canvas-subtle">· {common.footer.madeIn}</span>
          </p>
          <a
            href="#top"
            className="group inline-flex items-center gap-2 rounded-full border border-line-canvas px-3.5 py-1.5 text-xs font-semibold text-on-canvas-muted transition-colors duration-(--dur-150) hover:border-primary/50 hover:text-primary-bright"
          >
            {common.footer.backToTop}
            <ArrowUp aria-hidden="true" className="size-3.5 transition-transform duration-(--dur-200) ease-(--ease-out-soft) group-hover:-translate-y-0.5 motion-reduce:transition-none" strokeWidth={2} />
          </a>
        </div>
      </Container>

      <HideOnTool>
      {/* Oversized wordmark watermark, clipped by the footer edge */}
      <p aria-hidden="true" className="pointer-events-none -mb-[0.32em] select-none text-center font-brand text-[clamp(2.75rem,9.5vw,9rem)] whitespace-nowrap font-bold leading-none tracking-tight text-transparent bg-gradient-to-b from-primary/45 via-primary/20 to-primary/0 bg-clip-text">
        LexBridge Consultants
      </p>
      </HideOnTool>
    </footer>
  );
}
