'use client';

import { ChevronLeft } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { deriveOrderTitle } from '@/components/dashboard/ordersList';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { OrderStatusBadge } from '@/components/statusBadge';
import { StatusTimeline } from '@/components/statusTimeline';
import { ButtonLink, Card } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function OrderTotals({ order, copy }) {
  const format = useFormatters();
  const checkoutCopy = useDictionary().commerce.checkout;
  return (
    <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
      <div className="flex justify-between gap-4 text-ink-muted">
        <dt>{checkoutCopy.subtotal}</dt>
        <dd className="text-ink">{format.rupees(order.SubtotalPaise)}</dd>
      </div>
      {order.DiscountPaise > 0 && (
        <div className="flex justify-between gap-4 text-ink-muted">
          <dt>{order.CouponCode ? copy.discountWithCode(order.CouponCode) : checkoutCopy.discount}</dt>
          <dd className="text-ink">− {format.rupees(order.DiscountPaise)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4 pt-1 font-bold text-ink">
        <dt>{checkoutCopy.total}</dt>
        <dd>{format.rupees(order.TotalPaise)}</dd>
      </div>
      {order.RefundedPaise > 0 && (
        <div className="flex justify-between gap-4 text-ink-muted">
          <dt>{copy.refunded}</dt>
          <dd className="text-ink">{format.rupees(order.RefundedPaise)}</dd>
        </div>
      )}
    </dl>
  );
}

export function OrderDetail({ referenceCode }) {
  const commerceCopy = useDictionary().commerce;
  const copy = commerceCopy.orderDetail;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData(`/orders/mine/${encodeURIComponent(referenceCode)}`);

  if (isLoading && !data) return <LoadingNote />;
  if (error?.status === 404) {
    return (
      <Card padding="md">
        <h1 className="text-h3 text-ink">{copy.notFoundTitle}</h1>
        <p className="mt-1 text-ink-muted">{copy.notFoundBody}</p>
        <ButtonLink href="/dashboard/orders" variant="secondary" size="sm" className="mt-4">
          {copy.back}
        </ButtonLink>
      </Card>
    );
  }
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const order = data?.order;
  if (!order) return null;

  return (
    <div className="space-y-5">
      <div>
        <LocaleLink href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {copy.breadcrumb}
        </LocaleLink>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-h3 text-ink">{deriveOrderTitle(order, commerceCopy.orders)}</h1>
          <OrderStatusBadge status={order.Status} />
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.meta(order.ReferenceCode, format.dateTime(order.createdAt))}</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <Card as="section" padding="md" aria-labelledby="order-items">
            <h2 id="order-items" className="text-h4 text-ink">
              {copy.itemsTitle}
            </h2>
            <ul className="mt-3 space-y-2">
              {order.Items.map((item) => (
                <li key={item.Slug} className="flex items-start justify-between gap-4 text-sm">
                  <span>
                    <span className="block font-semibold text-ink">{item.TitleSnapshot}</span>
                    <span className="block text-xs text-ink-muted">{labels.productCategory(item.Category)}</span>
                  </span>
                  <span className="text-ink">{format.rupees(item.PricePaise)}</span>
                </li>
              ))}
            </ul>
            <OrderTotals order={order} copy={copy} />
          </Card>

          {order.ServiceRequestReference && (
            <Card as="section" padding="md" aria-labelledby="order-request">
              <h2 id="order-request" className="text-h4 text-ink">
                {copy.requestTitle}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{copy.requestBody(order.ServiceRequestReference)}</p>
              <ButtonLink href={`/dashboard/requests/${order.ServiceRequestReference}`} variant="secondary" size="sm" className="mt-3">
                {copy.viewRequest}
              </ButtonLink>
            </Card>
          )}
        </div>

        <Card as="section" padding="md" aria-labelledby="order-timeline">
          <h2 id="order-timeline" className="mb-4 text-h4 text-ink">
            {copy.timelineTitle}
          </h2>
          <StatusTimeline entries={order.StatusHistory} getLabel={labels.orderStatus} />
        </Card>
      </div>
    </div>
  );
}
