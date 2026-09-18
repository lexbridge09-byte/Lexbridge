import { formatRupees } from '@/lib/formatValues';

const AMOUNT_SIZES = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-3xl',
};

/*
  One price display for cards, menus, product pages and checkout. Works in server and client components.
  - "incl. GST" only when the brand confirms prices include it (BRAND.pricesIncludeGst)
  - the old price is struck through only when it is actually higher
  - no price yet: an honest "Fee shown before you pay"
*/
export function PriceTag({ pricePaise, compareAtPricePaise, locale, labels, showTax = false, size = 'md', className = '' }) {
  if (!Number.isFinite(pricePaise)) {
    return <p className={`text-sm font-semibold text-ink ${className}`}>{labels.feeShown}</p>;
  }
  const priceLabel = formatRupees(pricePaise, locale);
  const hasCompareAt = Number.isFinite(compareAtPricePaise) && compareAtPricePaise > pricePaise;

  return (
    <p className={`tabular flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      <span className={`font-display font-bold text-ink ${AMOUNT_SIZES[size] ?? AMOUNT_SIZES.md}`}>{priceLabel}</span>
      {hasCompareAt && (
        <>
          <s aria-hidden="true" className="text-xs text-ink-subtle">
            {formatRupees(compareAtPricePaise, locale)}
          </s>
          <span className="sr-only">{labels.was(formatRupees(compareAtPricePaise, locale))}</span>
        </>
      )}
      {showTax && <span className="text-xs font-medium text-ink-muted">{labels.inclGst}</span>}
    </p>
  );
}
