'use client';

import { PAID_ORDER_STATUSES } from '@lexbridge/shared';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LINK_CLASS, AdminBackLink, AdminField, AdminPanel } from '@/components/admin/adminStyles';
import { OrderTotals } from '@/components/dashboard/orderDetail';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { OrderStatusBadge, RequestStatusBadge } from '@/components/statusBadge';
import { StatusTimeline } from '@/components/statusTimeline';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { paiseToRupeesInput, rupeesToPaise } from '@/lib/money';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

function DetailItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

function RefundForm({ order, onRefunded }) {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.orderDetail.refund;
  const format = useFormatters();
  const remainingPaise = order.TotalPaise - (order.RefundedPaise ?? 0);
  const [mode, setMode] = useState('full');
  const [pendingRefund, setPendingRefund] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const isRefundable = PAID_ORDER_STATUSES.includes(order.Status) && order.Status !== 'refunded' && remainingPaise > 0;
  if (!isRefundable) return <p className="text-sm text-ink-muted">{copy.notRefundable}</p>;

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reason = String(formData.get('Reason') ?? '').trim();
    if (!reason) {
      setMessage({ tone: 'error', text: copy.reasonRequired });
      return;
    }
    let amountPaise = remainingPaise;
    if (mode === 'partial') {
      amountPaise = rupeesToPaise(formData.get('Amount'));
      if (!Number.isFinite(amountPaise) || amountPaise < 1 || amountPaise > remainingPaise) {
        setMessage({ tone: 'error', text: copy.invalidAmount(format.rupees(remainingPaise)) });
        return;
      }
    }
    setMessage(null);
    setPendingRefund({ amountPaise, reason, isFull: mode === 'full' });
  }

  async function confirmRefund() {
    setIsBusy(true);
    try {
      await requestApi(`/admin/orders/${encodeURIComponent(order.ReferenceCode)}/refunds`, {
        method: 'POST',
        body: { Reason: pendingRefund.reason, ...(pendingRefund.isFull ? {} : { AmountPaise: pendingRefund.amountPaise }) },
      });
      setPendingRefund(null);
      setMessage({ tone: 'success', text: copy.done });
      onRefunded();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setPendingRefund(null);
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <fieldset className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" name="refund-mode" checked={mode === 'full'} onChange={() => setMode('full')} className="accent-primary" />
          {copy.full(format.rupees(remainingPaise))}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" name="refund-mode" checked={mode === 'partial'} onChange={() => setMode('partial')} className="accent-primary" />
          {copy.partial}
        </label>
      </fieldset>
      {mode === 'partial' && (
        <AdminField id="refund-amount" label={copy.amount}>
          <input id="refund-amount" name="Amount" inputMode="decimal" placeholder={paiseToRupeesInput(remainingPaise)} className={ADMIN_CONTROL_CLASS} />
        </AdminField>
      )}
      <AdminField id="refund-reason" label={copy.reason}>
        <textarea id="refund-reason" name="Reason" rows={2} maxLength={500} placeholder={copy.reasonPlaceholder} className={ADMIN_CONTROL_CLASS} />
      </AdminField>
      <FormMessage message={message} />
      {pendingRefund ? (
        <div role="group" aria-label={copy.title} className="rounded-xl border border-danger/25 bg-danger-50 p-3">
          <p className="text-sm text-ink">{copy.confirm(format.rupees(pendingRefund.amountPaise))}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button variant="danger" size="sm" onClick={confirmRefund} disabled={isBusy}>
              {isBusy ? copy.busy : copy.confirmYes}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPendingRefund(null)} disabled={isBusy}>
              {copy.confirmNo}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" variant="danger" size="sm">
          {copy.submit}
        </Button>
      )}
    </form>
  );
}

export function AdminOrderDetail({ referenceCode }) {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.orderDetail;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData(`/admin/orders/${encodeURIComponent(referenceCode)}`);

  if (isLoading && !data) return <LoadingNote />;
  if (error?.status === 404) {
    return (
      <div>
        <p className="text-ink-muted">{copy.notFound(referenceCode)}</p>
        <div className="mt-3">
          <AdminBackLink href="/admin/orders">{copy.breadcrumb}</AdminBackLink>
        </div>
      </div>
    );
  }
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const order = data?.order;
  if (!order) return null;
  const requestReference = order.ServiceRequest?.ReferenceCode || order.ServiceRequestReference;

  return (
    <div>
      <AdminBackLink href="/admin/orders">{copy.breadcrumb}</AdminBackLink>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-h3 text-ink">{order.ReferenceCode}</h1>
        <OrderStatusBadge status={order.Status} />
      </div>
      <p className="mt-0.5 text-sm text-ink-muted">{copy.meta(format.dateTime(order.createdAt))}</p>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <AdminPanel as="section" title={copy.clientTitle}>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <DetailItem label={copy.name}>{order.FullName}</DetailItem>
              <DetailItem label={copy.email}>
                <a href={`mailto:${order.Email}`} className={`break-all ${ADMIN_LINK_CLASS}`}>
                  {order.Email}
                </a>
              </DetailItem>
              <DetailItem label={copy.phone}>
                <a href={`tel:${order.Phone.replace(/[^\d+]/g, '')}`} className={ADMIN_LINK_CLASS}>
                  {order.Phone}
                </a>
              </DetailItem>
              <DetailItem label={copy.language}>{labels.language(order.PreferredLanguage)}</DetailItem>
              <DetailItem label={copy.whatsApp}>{order.WhatsAppOptIn ? copy.optedIn : copy.notOptedIn}</DetailItem>
              <DetailItem label={copy.account}>{order.Client ? copy.linkedAccount : copy.guest}</DetailItem>
            </dl>
            {order.Description && (
              <div className="mt-3 border-t border-line pt-3">
                <p className="text-xs font-semibold text-ink-muted">{copy.notes}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-ink">{order.Description}</p>
              </div>
            )}
          </AdminPanel>

          <AdminPanel as="section" title={copy.itemsTitle}>
            <ul className="space-y-2">
              {order.Items.map((item) => (
                <li key={item.Slug} className="flex items-start justify-between gap-4 text-sm">
                  <span>
                    <span className="block font-semibold text-ink">{item.TitleSnapshot}</span>
                    <span className="block text-xs text-ink-muted">
                      {labels.productCategory(item.Category)} · {labels.service(item.ServiceCategory)}
                    </span>
                  </span>
                  <span>{format.rupees(item.PricePaise)}</span>
                </li>
              ))}
            </ul>
            <OrderTotals order={order} copy={dictionary.commerce.orderDetail} />
            <dl className="mt-3 grid gap-x-6 gap-y-2 border-t border-line pt-3 sm:grid-cols-3">
              <DetailItem label={copy.paidAt}>{order.paidAt ? format.dateTime(order.paidAt) : '—'}</DetailItem>
              <DetailItem label={copy.razorpayOrder}>{order.RazorpayOrderId || '—'}</DetailItem>
              <DetailItem label={copy.razorpayPayment}>{order.RazorpayPaymentId || '—'}</DetailItem>
            </dl>
          </AdminPanel>

          <AdminPanel as="section" title={copy.historyTitle}>
            <StatusTimeline entries={order.StatusHistory} getLabel={labels.orderStatus} />
          </AdminPanel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <AdminPanel as="section" title={copy.requestTitle}>
            {requestReference ? (
              <div className="flex items-center gap-3">
                <LocaleLink href={`/admin/requests/${requestReference}`} className={ADMIN_LINK_CLASS}>
                  {requestReference}
                </LocaleLink>
                {order.ServiceRequest?.Status && <RequestStatusBadge status={order.ServiceRequest.Status} />}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">{copy.noRequest}</p>
            )}
          </AdminPanel>

          <AdminPanel as="section" title={copy.refund.title}>
            <RefundForm key={order.updatedAt} order={order} onRefunded={reload} />
          </AdminPanel>

          <AdminPanel as="section" title={copy.refundsTitle}>
            {(order.Refunds ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">{copy.noRefunds}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {order.Refunds.map((refund) => (
                  <li key={refund.RazorpayRefundId} className="py-2">
                    <p className="font-semibold text-ink">{copy.refundSummary(format.rupees(refund.AmountPaise), labels.refundStatus(refund.Status))}</p>
                    {refund.Reason && <p className="text-ink-muted">{refund.Reason}</p>}
                    <p className="text-xs text-ink-muted">
                      {copy.refundMeta(refund.CreatedBy?.FullName || refund.CreatedBy?.Email || dictionary.adminCommerce.callbacks.adminFallback, format.dateTime(refund.createdAt))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
