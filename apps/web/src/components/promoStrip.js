import { LocaleLink } from '@/components/localeLink';

// Hidden unless the brand copy carries a real, current offer
export function PromoStrip({ promo }) {
  if (!promo?.text) return null;
  return (
    <div className="bg-linear-to-r from-primary-deep via-primary-dark to-primary text-white">
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[13px] sm:px-6">
        <span>{promo.text}</span>
        {promo.href && promo.linkLabel && (
          <LocaleLink href={promo.href} className="rounded-full bg-white px-3.5 py-1 text-xs font-bold text-primary-dark hover:bg-primary-50">
            {promo.linkLabel}
          </LocaleLink>
        )}
      </div>
    </div>
  );
}
