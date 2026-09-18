'use client';

import { CalendarDays } from 'lucide-react';
import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { LocaleLink } from '@/components/localeLink';
import { ButtonLink } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';

// Price with the "was" price struck through only when it is actually higher
export function ProductPrice({ pricePaise, compareAtPricePaise, size = 'md' }) {
  const copy = useDictionary().commerce.catalogue;
  const format = useFormatters();
  const hasCompareAt = Number.isFinite(compareAtPricePaise) && compareAtPricePaise > pricePaise;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-display font-bold text-ink ${size === 'lg' ? 'text-3xl' : 'text-lg'}`}>{format.rupees(pricePaise)}</span>
      {hasCompareAt && (
        <>
          <s aria-hidden="true" className="text-xs text-ink-muted">
            {format.rupees(compareAtPricePaise)}
          </s>
          <span className="sr-only">{copy.wasPrice(format.rupees(compareAtPricePaise))}</span>
        </>
      )}
    </p>
  );
}

export function deriveProductActionHref(product) {
  return isFeatureEnabled('onlinePayments') ? `/checkout/${product.Slug}` : `/services/${product.Slug}`;
}

// Compact card: category and turnaround, title, one line of summary, price and action
export function ProductCard({ product }) {
  const copy = useDictionary().commerce.catalogue;
  const labels = useCatalogLabels();
  const canBuy = isFeatureEnabled('onlinePayments');

  return (
    <article className="relative flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:border-primary-100 hover:shadow-card">
      <p className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-primary">{labels.productCategory(product.Category)}</span>
        {product.TurnaroundText && (
          <span className="flex items-center gap-1 truncate text-ink-muted">
            <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.75} />
            {product.TurnaroundText}
          </span>
        )}
      </p>
      <h3 className="mt-1.5 font-display text-[15px] font-semibold leading-6 text-ink">
        <LocaleLink href={`/services/${product.Slug}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-['']">
          {product.Title}
        </LocaleLink>
      </h3>
      {product.Summary && <p className="line-clamp-1 text-sm leading-5 text-ink-muted">{product.Summary}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <ProductPrice pricePaise={product.PricePaise} compareAtPricePaise={product.CompareAtPricePaise} />
        <ButtonLink href={deriveProductActionHref(product)} size="sm" className="relative z-10 shrink-0">
          {canBuy ? copy.buyNow : copy.getStarted}
        </ButtonLink>
      </div>
    </article>
  );
}
