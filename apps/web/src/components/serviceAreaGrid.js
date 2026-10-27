import { ArrowRight, Check } from 'lucide-react';
import { createElement } from 'react';
import { LocaleLink } from '@/components/localeLink';
import { Stagger, StaggerItem } from '@/components/ui';
import { getServiceIcon } from '@/lib/icons';

const PREVIEW_ITEM_COUNT = 5;

// Column span for the last card so the final row is always full (featured card takes 2 cells)
const LAST_SPAN_LG = ['lg:col-span-3', 'lg:col-span-2', ''];
const LAST_SPAN_SM = ['sm:col-span-2', ''];

// Every service area at a glance (bento grid; the first area is featured and wider).
// Header menu links like "/services#contract-review" land on the card and highlight it via :target.
export function ServiceAreaGrid({ copy, serviceKeys, serviceHrefs, featuredFacts = [] }) {
  return (
    <Stagger gap={0.05} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {serviceKeys.map((serviceKey, serviceIndex) => {
        const service = copy.items[serviceKey];
        if (!service) return null;
        const isFeatured = serviceIndex === 0;
        const isLast = serviceIndex === serviceKeys.length - 1;
        const cellsBeforeLast = serviceKeys.length; // featured (2) + the others before the last (n - 2)
        const lastSpan = isLast ? `${LAST_SPAN_SM[cellsBeforeLast % 2]} ${LAST_SPAN_LG[cellsBeforeLast % 3]}` : '';
        const isWide = isLast && cellsBeforeLast % 3 !== 2;
        const previewItems = service.items.slice(0, isFeatured || isWide ? service.items.length : PREVIEW_ITEM_COUNT);

        return (
          <StaggerItem key={serviceKey} className={isFeatured ? 'sm:col-span-2' : lastSpan}>
            <article
              id={serviceKey}
              className={`group relative flex h-full scroll-mt-28 flex-col overflow-hidden rounded-panel border p-6 transition-[transform,border-color,box-shadow] duration-(--dur-300) ease-(--ease-out-soft) hover:-translate-y-1 hover:border-primary/50 hover:shadow-float target:border-primary target:shadow-glow motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${isFeatured ? 'border-primary/30 bg-hero lg:p-8' : 'border-line-canvas bg-canvas-alt'}`}
            >
              {/* Warm light that follows the card on hover */}
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.22),transparent)] opacity-0 transition-opacity duration-(--dur-300) group-hover:opacity-100" />

              <span
                className={`flex shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-bright ring-1 ring-primary/30 transition-transform duration-(--dur-300) ease-(--ease-out-soft) group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none ${isFeatured ? 'size-14' : 'size-11'}`}
              >
                {createElement(getServiceIcon(serviceKey), { 'aria-hidden': true, className: isFeatured ? 'size-7' : 'size-5', strokeWidth: 1.75 })}
              </span>

              <h2 className={`mt-5 font-heading font-bold leading-tight text-on-canvas ${isFeatured ? 'text-3xl lg:text-4xl' : 'text-2xl'}`}>{service.title}</h2>
              <p className={`mt-2 leading-7 text-on-canvas-muted ${isFeatured ? 'max-w-lg text-base lg:text-lg' : 'text-[15px]'}`}>{service.intro}</p>

              <ul className={`mt-5 grid gap-x-6 gap-y-2 ${isFeatured ? 'sm:grid-cols-2' : isWide ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
                {previewItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-on-canvas">
                    <Check aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-primary-bright" strokeWidth={2.75} />
                    {item}
                  </li>
                ))}
              </ul>
              {isFeatured && featuredFacts.length > 0 && (
                <ul className="mt-6 grid gap-3 border-t border-line-canvas pt-5 sm:grid-cols-3">
                  {featuredFacts.map((fact) => (
                    <li key={fact.key} className="flex items-center gap-2.5 text-sm font-medium text-on-canvas-muted">
                      {createElement(fact.icon, { 'aria-hidden': true, className: 'size-4 shrink-0 text-primary-bright', strokeWidth: 2 })}
                      {fact.label}
                    </li>
                  ))}
                </ul>
              )}
              {previewItems.length < service.items.length && <p className="mt-2 pl-6 text-xs font-semibold text-primary-bright">{copy.showMore}</p>}

              <div className="mt-auto pt-6">
                <LocaleLink
                  href={serviceHrefs[serviceKey]}
                  className={`inline-flex items-center gap-2 rounded-control font-semibold transition-colors duration-(--dur-150) after:absolute after:inset-0 after:content-[''] ${isFeatured ? 'bg-cta px-5 py-3 text-[15px] text-canvas' : 'text-sm text-primary-bright group-hover:text-white'}`}
                >
                  {service.ctaLabel}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-(--dur-200) ease-(--ease-out-soft) group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2} />
                </LocaleLink>
              </div>
            </article>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
