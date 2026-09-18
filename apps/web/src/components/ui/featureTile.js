import { ChevronRight } from 'lucide-react';
import { LocaleLink } from '@/components/localeLink';

// Compact row tile: icon left, title and one line of description, chevron. The link covers the whole tile.
export function FeatureTile({ icon: Icon, title, description, href, linkLabel }) {
  return (
    <article className="relative flex h-full min-h-[5.5rem] items-center gap-3.5 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-sm transition hover:border-primary-100 hover:shadow-card">
      {Icon && (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[15px] font-semibold leading-6 text-ink">
          {href ? (
            <LocaleLink href={href} className="after:absolute after:inset-0 after:rounded-2xl after:content-['']">
              {title}
              {linkLabel && <span className="sr-only">: {linkLabel}</span>}
            </LocaleLink>
          ) : (
            title
          )}
        </h3>
        {description && <p className={`mt-0.5 text-sm leading-5 text-ink-muted ${href ? 'line-clamp-1' : 'line-clamp-2'}`}>{description}</p>}
      </div>
      {href && <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={2} />}
    </article>
  );
}
