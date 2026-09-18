import { ArrowRight, ChevronRight } from 'lucide-react';
import { LocaleLink } from '@/components/localeLink';
import { Section, SectionHeader } from '@/components/ui';
import { formatRupees } from '@/lib/formatValues';
import { getIcon } from '@/lib/icons';

// Life-situation tiles with direct links to products (priced when published) or common problems
export function SituationTiles({ title, description, groups, allServicesLabel, priceFrom, locale }) {
  return (
    <Section tone="alt" labelledBy="situations-title">
      <SectionHeader id="situations-title" title={title} description={description} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const Icon = getIcon(group.icon);
          return (
            <li key={group.key} className="lift flex flex-col rounded-card border border-line bg-white p-5">
              <div className="flex items-start gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-h4 text-ink">
                    <LocaleLink href={group.href} className="rounded-sm transition-colors duration-(--dur-150) hover:text-primary">
                      {group.label}
                    </LocaleLink>
                  </h3>
                  <p className="mt-0.5 text-sm leading-5 text-ink-muted">{group.description}</p>
                </div>
              </div>

              {group.links.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {group.links.map((link) => (
                    <li key={link.key}>
                      <LocaleLink
                        href={link.href}
                        className="group/chip inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface-alt px-3 py-1.5 text-[13px] font-medium text-ink transition-colors duration-(--dur-150) hover:border-primary-100 hover:bg-primary-50 hover:text-primary-dark"
                      >
                        {link.label}
                        {Number.isFinite(link.pricePaise) && (
                          <span className="tabular text-ink-muted">· {priceFrom(formatRupees(link.pricePaise, locale))}</span>
                        )}
                        <ChevronRight
                          aria-hidden="true"
                          className="size-3.5 text-ink-subtle transition-transform duration-(--dur-150) group-hover/chip:translate-x-0.5 motion-reduce:transition-none"
                          strokeWidth={2}
                        />
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}

        <li>
          <LocaleLink
            href="/services"
            className="group flex h-full min-h-28 items-center justify-center gap-2 rounded-card border border-dashed border-line-hover bg-white/60 p-5 font-display font-semibold text-primary transition-colors duration-(--dur-150) hover:border-primary hover:bg-white"
          >
            {allServicesLabel}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-(--dur-200) group-hover:translate-x-1 motion-reduce:transition-none"
              strokeWidth={2}
            />
          </LocaleLink>
        </li>
      </ul>
    </Section>
  );
}
