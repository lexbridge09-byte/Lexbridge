'use client';

import { ORDER_STATUSES } from '@lexbridge/shared';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { buildAdminQuery } from '@/components/admin/adminRequests';
import {
  ADMIN_CONTROL_CLASS,
  ADMIN_LINK_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminField,
  AdminPageHeading,
  AdminTable,
} from '@/components/admin/adminStyles';
import { deriveOrderTitle } from '@/components/dashboard/ordersList';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Pagination } from '@/components/pagination';
import { OrderStatusBadge } from '@/components/statusBadge';
import { Button } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 20;

export function AdminOrders({ initialStatus = '' }) {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.orders;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [filters, setFilters] = useState({ status: initialStatus, q: '' });
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useApiData(`/admin/orders?${buildAdminQuery(filters, page, PAGE_LIMIT)}`);
  const items = data?.items ?? [];

  function handleFilterSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFilters({ status: String(formData.get('status') ?? ''), q: String(formData.get('q') ?? '').trim() });
    setPage(1);
  }

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <form onSubmit={handleFilterSubmit} className="mb-4 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <AdminField id="order-status-filter" label={common.status}>
          <select id="order-status-filter" name="status" defaultValue={filters.status} className={ADMIN_CONTROL_CLASS}>
            <option value="">{common.allStatuses}</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labels.orderStatus(status)}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField id="order-q" label={common.search}>
          <input id="order-q" name="q" type="search" defaultValue={filters.q} placeholder={copy.searchPlaceholder} className={ADMIN_CONTROL_CLASS} />
        </AdminField>
        <Button type="submit" size="sm">
          {common.apply}
        </Button>
      </form>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-ink-muted" aria-live="polite">
            {copy.count(data.total)}
          </p>
          <AdminTable>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.reference}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.client}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.items}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.total}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.status}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.created}</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((order) => (
                <tr key={order.ReferenceCode} className="hover:bg-surface-alt">
                  <td className={ADMIN_TD_CLASS}>
                    <LocaleLink href={`/admin/orders/${order.ReferenceCode}`} className={ADMIN_LINK_CLASS}>
                      {order.ReferenceCode}
                    </LocaleLink>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <span className="block">{order.FullName}</span>
                    <span className="block text-xs text-ink-muted">{order.Email}</span>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{deriveOrderTitle(order, dictionary.commerce.orders)}</td>
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.rupees(order.TotalPaise)}</td>
                  <td className={ADMIN_TD_CLASS}>
                    <OrderStatusBadge status={order.Status} />
                  </td>
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.dateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination page={data.page ?? page} limit={data.limit ?? PAGE_LIMIT} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
