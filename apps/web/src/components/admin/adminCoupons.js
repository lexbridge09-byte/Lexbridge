'use client';

import { useDictionary } from '@/brand/localeContext';
import { ADMIN_LINK_CLASS, ADMIN_TD_CLASS, ADMIN_TH_CLASS, AdminPageHeading, AdminTable } from '@/components/admin/adminStyles';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Badge, ButtonLink } from '@/components/ui';
import { useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function AdminCoupons() {
  const copy = useDictionary().adminCommerce.coupons;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/admin/coupons');
  const coupons = data?.coupons ?? [];

  function describeWindow(coupon) {
    if (coupon.StartsAt && coupon.EndsAt) return copy.between(format.date(coupon.StartsAt), format.date(coupon.EndsAt));
    if (coupon.StartsAt) return copy.from(format.date(coupon.StartsAt));
    if (coupon.EndsAt) return copy.until(format.date(coupon.EndsAt));
    return copy.always;
  }

  return (
    <div>
      <AdminPageHeading
        title={copy.title}
        description={copy.description}
        action={
          <ButtonLink href="/admin/coupons/new" size="sm">
            {copy.newCoupon}
          </ButtonLink>
        }
      />

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : coupons.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.code}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.discount}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.usage}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.window}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.status}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {coupons.map((coupon) => (
              <tr key={coupon._id} className="hover:bg-surface-alt">
                <td className={ADMIN_TD_CLASS}>
                  <LocaleLink href={`/admin/coupons/${coupon._id}`} className={`font-mono ${ADMIN_LINK_CLASS}`}>
                    {coupon.Code}
                  </LocaleLink>
                  {coupon.Description && <span className="block text-xs text-ink-muted">{coupon.Description}</span>}
                </td>
                <td className={ADMIN_TD_CLASS}>
                  {coupon.Type === 'percent' ? copy.percentValue(coupon.Value) : copy.flatValue(format.rupees(coupon.Value))}
                </td>
                <td className={ADMIN_TD_CLASS}>{copy.usage(coupon.RedemptionCount ?? 0, coupon.MaxRedemptions)}</td>
                <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{describeWindow(coupon)}</td>
                <td className={ADMIN_TD_CLASS}>
                  <Badge tone={coupon.IsActive ? 'done' : 'neutral'}>{coupon.IsActive ? copy.active : copy.inactive}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
