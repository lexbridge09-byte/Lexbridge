'use client';

import { CALLBACK_STATUSES } from '@lexbridge/shared';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { buildAdminQuery } from '@/components/admin/adminRequests';
import { ADMIN_CONTROL_CLASS, ADMIN_LINK_CLASS, AdminField, AdminPageHeading } from '@/components/admin/adminStyles';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { Pagination } from '@/components/pagination';
import { CallbackStatusBadge } from '@/components/statusBadge';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 25;

function CallbackUpdateForm({ callback, onSaved }) {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.callbacks;
  const labels = useCatalogLabels();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const idPrefix = `callback-${callback.ReferenceCode}`;

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const status = String(formData.get('Status') ?? '');
    const note = String(formData.get('Note') ?? '').trim();
    const body = {};
    if (status !== callback.Status) body.Status = status;
    if (note) body.Note = note;
    if (Object.keys(body).length === 0) {
      setMessage({ tone: 'error', text: copy.nothingChanged });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await requestApi(`/admin/callbacks/${encodeURIComponent(callback.ReferenceCode)}`, { method: 'PATCH', body });
      onSaved();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[12rem_1fr]">
      <AdminField id={`${idPrefix}-status`} label={dictionary.admin.common.status}>
        <select id={`${idPrefix}-status`} name="Status" defaultValue={callback.Status} className={ADMIN_CONTROL_CLASS}>
          {CALLBACK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {labels.callbackStatus(status)}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField id={`${idPrefix}-note`} label={copy.note}>
        <textarea id={`${idPrefix}-note`} name="Note" rows={2} maxLength={1000} placeholder={copy.notePlaceholder} className={ADMIN_CONTROL_CLASS} />
      </AdminField>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? dictionary.admin.common.saving : copy.save}
        </Button>
        <FormMessage message={message} />
      </div>
    </form>
  );
}

export function AdminCallbacks() {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.callbacks;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useApiData(`/admin/callbacks?${buildAdminQuery(filters, page, PAGE_LIMIT)}`);
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
        <AdminField id="callback-status-filter" label={common.status}>
          <select id="callback-status-filter" name="status" defaultValue={filters.status} className={ADMIN_CONTROL_CLASS}>
            <option value="">{common.allStatuses}</option>
            {CALLBACK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labels.callbackStatus(status)}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField id="callback-q" label={common.search}>
          <input id="callback-q" name="q" type="search" defaultValue={filters.q} placeholder={copy.searchPlaceholder} className={ADMIN_CONTROL_CLASS} />
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
          <ul className="space-y-2">
            {items.map((callback) => (
              <li key={callback.ReferenceCode}>
                <details className="group rounded-xl border border-line bg-white open:shadow-sm">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">
                        {callback.FullName} ·{' '}
                        <a href={`tel:${callback.Phone.replace(/[^\d+]/g, '')}`} onClick={(event) => event.stopPropagation()} className={ADMIN_LINK_CLASS}>
                          {callback.Phone}
                        </a>
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {[
                          callback.ReferenceCode,
                          labels.callbackTimeWindow(callback.PreferredTime),
                          labels.language(callback.PreferredLanguage),
                          copy.requested(format.dateTime(callback.createdAt)),
                        ].join(' · ')}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <CallbackStatusBadge status={callback.Status} />
                      <ChevronDown aria-hidden="true" className="size-4 text-primary transition-transform group-open:rotate-180" strokeWidth={2} />
                    </span>
                  </summary>
                  <div className="space-y-3 px-4 pb-4">
                    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold text-ink-muted">{copy.topic}</dt>
                        <dd className="text-sm text-ink">{callback.Topic || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-ink-muted">{copy.service}</dt>
                        <dd className="text-sm text-ink">{callback.ServiceCategory ? labels.service(callback.ServiceCategory) : '—'}</dd>
                      </div>
                    </dl>
                    {(callback.Notes ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-ink-muted">{copy.historyTitle}</p>
                        <ul className="mt-1 divide-y divide-line text-sm">
                          {[...callback.Notes].reverse().map((entry) => (
                            <li key={entry.changedAt} className="py-1.5">
                              <span className="font-semibold text-ink">{labels.callbackStatus(entry.Status)}</span>
                              {entry.Note && <span className="text-ink">: {entry.Note}</span>}
                              <span className="block text-xs text-ink-muted">
                                {copy.noteMeta(entry.ChangedBy?.FullName || entry.ChangedBy?.Email || copy.adminFallback, format.dateTime(entry.changedAt))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <CallbackUpdateForm key={callback.updatedAt ?? callback.Status} callback={callback} onSaved={reload} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <Pagination page={data.page ?? page} limit={data.limit ?? PAGE_LIMIT} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
