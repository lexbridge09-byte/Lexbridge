'use client';

import { useState } from 'react';
import { REQUEST_STATUSES, SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import {
  ADMIN_CONTROL_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_LINK_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminPageHeading,
  AdminTable,
} from '@/components/admin/adminStyles';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Pagination } from '@/components/pagination';
import { RequestStatusBadge } from '@/components/statusBadge';
import { Button } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 20;

export function buildAdminQuery(filters, page, limit = PAGE_LIMIT) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function AdminRequests({ initialStatus = '' }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.requests;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [filters, setFilters] = useState({ status: initialStatus, category: '', q: '' });
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useApiData(`/admin/service-requests?${buildAdminQuery(filters, page)}`);

  function handleFilterSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFilters({
      status: String(formData.get('status') ?? ''),
      category: String(formData.get('category') ?? ''),
      q: String(formData.get('q') ?? '').trim(),
    });
    setPage(1);
  }

  const items = data?.items ?? [];
  const columns = copy.columns;

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <form onSubmit={handleFilterSubmit} className="mb-4 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
        <div>
          <label htmlFor="filter-status" className={ADMIN_LABEL_CLASS}>
            {common.status}
          </label>
          <select id="filter-status" name="status" defaultValue={filters.status} className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
            <option value="">{common.allStatuses}</option>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labels.requestStatus(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-category" className={ADMIN_LABEL_CLASS}>
            {copy.service}
          </label>
          <select id="filter-category" name="category" defaultValue={filters.category} className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
            <option value="">{copy.allServices}</option>
            {SERVICE_CATEGORY_KEYS.map((serviceKey) => (
              <option key={serviceKey} value={serviceKey}>
                {labels.service(serviceKey)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-q" className={ADMIN_LABEL_CLASS}>
            {common.search}
          </label>
          <input
            id="filter-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={copy.searchPlaceholder}
            title={copy.searchHint}
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          />
        </div>
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
            {isLoading ? copy.updating : ''}
          </p>
          <AdminTable>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>{columns.reference}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{columns.client}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{columns.service}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{columns.status}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{columns.assigned}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{columns.received}</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((request) => (
                <tr key={request.ReferenceCode} className="hover:bg-surface-alt">
                  <td className={ADMIN_TD_CLASS}>
                    <LocaleLink href={`/admin/requests/${request.ReferenceCode}`} className={ADMIN_LINK_CLASS}>
                      {request.ReferenceCode}
                    </LocaleLink>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <span className="block">{request.FullName}</span>
                    <span className="block text-xs text-ink-muted">{request.Email}</span>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    {labels.service(request.ServiceCategory)}
                    {request.Subtype && <span className="block text-xs text-ink-muted">{request.Subtype}</span>}
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <RequestStatusBadge status={request.Status} />
                  </td>
                  <td className={ADMIN_TD_CLASS}>{request.AssignedTo?.FullName || request.AssignedTo?.Email || copy.unassigned}</td>
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.dateTime(request.createdAt)}</td>
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
