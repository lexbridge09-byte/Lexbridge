'use client';

import { ChevronRight } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { OrderStatusBadge } from '@/components/statusBadge';
import { Card } from '@/components/ui';
import { useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function deriveOrderTitle(order, copy) {
  const [firstItem, ...otherItems] = order.Items ?? [];
  if (!firstItem) return order.ReferenceCode;
  return otherItems.length ? `${firstItem.TitleSnapshot} ${copy.moreItems(otherItems.length)}` : firstItem.TitleSnapshot;
}

export function OrdersList() {
  const copy = useDictionary().commerce.orders;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/orders/mine');
  const orders = data?.orders ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h3 text-ink">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.intro}</p>
      </div>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <Card padding="md">
          <p className="text-ink-muted">
            {copy.empty}{' '}
            <LocaleLink href="/services" className="font-semibold text-primary underline-offset-4 hover:underline">
              {copy.emptyCta}
            </LocaleLink>
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li key={order.ReferenceCode}>
                <LocaleLink href={`/dashboard/orders/${order.ReferenceCode}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-alt sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{deriveOrderTitle(order, copy)}</p>
                    <p className="text-xs text-ink-muted">{copy.meta(order.ReferenceCode, format.date(order.createdAt))}</p>
                  </div>
                  <span className="hidden font-semibold text-ink sm:block">{format.rupees(order.TotalPaise)}</span>
                  <OrderStatusBadge status={order.Status} />
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={2} />
                </LocaleLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
