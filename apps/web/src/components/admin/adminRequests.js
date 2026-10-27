'use client';

import { ArrowUpRight, ChevronRight, Mail, Paperclip, Phone, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { REQUEST_STATUSES, SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { AdminPageHeading } from '@/components/admin/adminStyles';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Pagination } from '@/components/pagination';
import { SelectMenu } from '@/components/selectMenu';
import { RequestStatusBadge } from '@/components/statusBadge';
import { Button, SideSheet } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { derivePersonLabel } from '@/lib/formatValues';
import { useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 300;

export function buildAdminQuery(filters, page, limit = PAGE_LIMIT) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

// Initials avatar for the assignee column (no photo storage needed)
function deriveInitials(name) {
  return String(name ?? '')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/*
  Request queue (admin and the team desk). Dense layout in the Stripe/Linear mould:
  status tabs with live counts, one-line search, compact rows; clicking a row opens a side sheet with
  the request and quick actions (assign a lawyer, change status) — no page change. Document
  previews live on the full request page.
  Phones get stacked cards instead of a table.
*/
export function AdminRequests({
  initialStatus = '',
  basePath = '/admin/service-requests',
  detailHrefBase = '/admin/requests',
  teamSourcePath = '/admin/users?role=staff&limit=100',
  heading,
} = {}) {
  const dictionary = useDictionary();
  const copy = heading ? { ...dictionary.admin.requests, title: heading.title, description: heading.description } : dictionary.admin.requests;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [filters, setFilters] = useState({ status: initialStatus, category: '', q: '', sort: 'newest' });
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [openReference, setOpenReference] = useState(null);
  const { data, error, isLoading, reload } = useApiData(`${basePath}?${buildAdminQuery(filters, page)}`);

  // Search as you type (debounced) — no Apply button
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.q === searchText.trim() ? current : { ...current, q: searchText.trim() }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const items = data?.items ?? [];
  const statusCounts = data?.statusCounts;
  const allCount = statusCounts ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0) : null;
  const columns = copy.columns;

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      {/* Status tabs with counts: the queue at a glance */}
      <div role="tablist" aria-label={common.status} className="scroll-row -mx-1 mb-3 flex gap-1 overflow-x-auto px-1">
        {['', ...REQUEST_STATUSES].map((status) => {
          const isActive = filters.status === status;
          const count = status ? statusCounts?.[status] : allCount;
          return (
            <button
              key={status || 'all'}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => updateFilter('status', status)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-(--dur-150) ${isActive ? 'bg-cta text-canvas' : 'text-on-canvas-muted hover:bg-canvas-raised hover:text-on-canvas'}`}
            >
              {status ? labels.requestStatus(status) : copy.allTab}
              {Number.isFinite(count) && (
                <span className={`tabular rounded-full px-1.5 text-xs ${isActive ? 'bg-canvas/15' : 'bg-canvas-raised text-on-canvas-subtle'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar: search, service, sort */}
      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem_11rem]">
        <label className="relative block">
          <span className="sr-only">{common.search}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={2} />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={copy.searchPlaceholder}
            title={copy.searchHint}
            className="block h-11 w-full rounded-control border border-line-strong bg-card pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100"
          />
        </label>
        <div className="[&>div]:mt-0">
          <SelectMenu
            id="filter-category"
            name="category"
            options={[{ value: '', label: copy.allServices }, ...SERVICE_CATEGORY_KEYS.map((key) => ({ value: key, label: labels.service(key) }))]}
            value={filters.category}
            onChange={(event) => updateFilter('category', event.target.value)}
          />
        </div>
        <div className="[&>div]:mt-0">
          <SelectMenu
            id="filter-sort"
            name="sort"
            options={[{ value: 'newest', label: copy.sortNewest }, { value: 'oldest', label: copy.sortOldest }]}
            value={filters.sort}
            onChange={(event) => updateFilter('sort', event.target.value)}
          />
        </div>
      </div>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-canvas px-4 py-10 text-center text-sm text-on-canvas-muted">{copy.empty}</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-on-canvas-subtle" aria-live="polite">
            {copy.count(data.total)}
            {isLoading ? copy.updating : ''}
          </p>

          {/* Desktop: dense table. Whole row opens the side sheet. */}
          <div className="hidden overflow-hidden rounded-card border border-line bg-card md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-card-dim">
                <tr className="text-xs font-semibold text-ink-muted">
                  <th scope="col" className="px-3 py-2">{columns.client}</th>
                  <th scope="col" className="px-3 py-2">{columns.service}</th>
                  <th scope="col" className="px-3 py-2">{columns.status}</th>
                  <th scope="col" className="px-3 py-2">{columns.assigned}</th>
                  <th scope="col" className="px-3 py-2 text-right">{columns.received}</th>
                  <th scope="col" className="w-8 px-2 py-2"><span className="sr-only">{copy.sheet.openFull}</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((request) => {
                  const assignee = derivePersonLabel(request.AssignedTo);
                  return (
                    <tr
                      key={request.ReferenceCode}
                      onClick={() => setOpenReference(request.ReferenceCode)}
                      className={`group cursor-pointer border-t border-line transition-colors duration-(--dur-100) hover:bg-primary-50/60 ${openReference === request.ReferenceCode ? 'bg-primary-50' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <button type="button" className="block max-w-[16rem] text-left focus:outline-none" onClick={() => setOpenReference(request.ReferenceCode)}>
                          <span className="block truncate font-semibold text-ink">{request.FullName}</span>
                          <span className="flex items-center gap-2 text-xs text-ink-muted">
                            <span className="font-mono">{request.ReferenceCode}</span>
                            {request.DocumentCount > 0 && (
                              <span className="inline-flex items-center gap-0.5" title={copy.filesCount.replace('{count}', request.DocumentCount)}>
                                <Paperclip aria-hidden="true" className="size-3" strokeWidth={2} />
                                {request.DocumentCount}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="max-w-[18rem] px-3 py-2">
                        <span className="block truncate text-ink">{labels.service(request.ServiceCategory)}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {request.Subtype ? (dictionary.intake.subtypes[request.Subtype]?.label ?? request.Subtype) : request.Description}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <RequestStatusBadge status={request.Status} />
                      </td>
                      <td className="px-3 py-2">
                        {assignee ? (
                          <span className="flex items-center gap-2">
                            <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-dark">
                              {deriveInitials(assignee)}
                            </span>
                            <span className="max-w-[11rem] truncate" title={request.AssignedTo?.Email}>{assignee}</span>
                          </span>
                        ) : (
                          <span className="text-ink-muted">{copy.unassigned}</span>
                        )}
                      </td>
                      <td className="tabular whitespace-nowrap px-3 py-2 text-right text-xs text-ink-muted">{format.dateTime(request.createdAt)}</td>
                      <td className="px-2 py-2 text-ink-muted">
                        <ChevronRight aria-hidden="true" className="size-4 transition-transform duration-(--dur-150) group-hover:translate-x-0.5" strokeWidth={2} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phones: stacked cards */}
          <ul className="space-y-2 md:hidden">
            {items.map((request) => (
              <li key={request.ReferenceCode}>
                <button
                  type="button"
                  onClick={() => setOpenReference(request.ReferenceCode)}
                  className="w-full rounded-card border border-line bg-card p-3.5 text-left transition-colors duration-(--dur-150) active:bg-primary-50"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{request.FullName}</span>
                      <span className="block truncate text-xs text-ink-muted">{labels.service(request.ServiceCategory)}</span>
                    </span>
                    <RequestStatusBadge status={request.Status} />
                  </span>
                  <span className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
                    <span className="font-mono">{request.ReferenceCode}</span>
                    {request.DocumentCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Paperclip aria-hidden="true" className="size-3" strokeWidth={2} />
                        {request.DocumentCount}
                      </span>
                    )}
                    <span className="ml-auto">{format.dateTime(request.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <Pagination page={data.page ?? page} limit={data.limit ?? PAGE_LIMIT} total={data.total} onPageChange={setPage} />
        </>
      )}

      <RequestSheet
        referenceCode={openReference}
        detailPath={openReference ? `${basePath}/${openReference}` : null}
        fullHref={openReference ? `${detailHrefBase}/${openReference}` : ''}
        teamSourcePath={openReference ? teamSourcePath : null}
        onClose={() => setOpenReference(null)}
        onChanged={reload}
      />
    </div>
  );
}

// Side sheet: the request at a glance plus quick actions — assign a lawyer and change status in one save
function RequestSheet({ referenceCode, detailPath, fullHref, teamSourcePath, onClose, onChanged }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.requests.sheet;
  const detailCopy = dictionary.admin.requestDetail;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData(detailPath);
  const teamData = useApiData(teamSourcePath);
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState(null);
  const [saveState, setSaveState] = useState({ isSaving: false, message: '' });
  const request = data?.request;
  const team = teamData.data?.items ?? [];
  const savedAssignee = String(request?.AssignedTo?._id ?? request?.AssignedTo ?? '');
  const currentStatus = status || request?.Status || '';
  const currentAssignee = assignee ?? savedAssignee;
  const hasChanges = Boolean(request) && (currentStatus !== request.Status || currentAssignee !== savedAssignee);
  const documentCount = data?.documents?.length ?? 0;

  async function saveChanges() {
    if (!hasChanges) return;
    const body = {};
    if (currentStatus !== request.Status) body.Status = currentStatus;
    if (currentAssignee !== savedAssignee) body.AssignedTo = currentAssignee || null;
    setSaveState({ isSaving: true, message: '' });
    try {
      await requestApi(detailPath, { method: 'PATCH', body });
      setStatus('');
      setAssignee(null);
      setSaveState({ isSaving: false, message: copy.saved });
      reload();
      onChanged();
    } catch (saveError) {
      setSaveState({ isSaving: false, message: localizeApiError(saveError, dictionary) });
    }
  }

  const sheetLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted';
  const fileLabel = documentCount === 1 ? dictionary.admin.requests.fileOne : dictionary.admin.requests.filesCount.replace('{count}', documentCount);

  // Pinned footer: assign and status side by side, saved together
  const footer = request && (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <p id="sheet-assignee-label" className={sheetLabelClass}>{detailCopy.update.assignedTo}</p>
          <div className="[&>div]:mt-1">
            <SelectMenu
              id="sheet-assignee"
              name="AssignedTo"
              labelId="sheet-assignee-label"
              options={[
                { value: '', label: dictionary.admin.requests.unassigned },
                ...team.map((member) => ({
                  value: String(member._id),
                  label: `${derivePersonLabel(member)}${member.Role === 'lawyer' ? '' : ` (${labels.role(member.Role)})`}`,
                })),
              ]}
              value={currentAssignee}
              onChange={(event) => setAssignee(event.target.value)}
            />
          </div>
        </div>
        <div>
          <p id="sheet-status-label" className={sheetLabelClass}>{copy.status}</p>
          <div className="[&>div]:mt-1">
            <SelectMenu
              id="sheet-status"
              name="Status"
              labelId="sheet-status-label"
              options={REQUEST_STATUSES.map((key) => ({ value: key, label: labels.requestStatus(key) }))}
              value={currentStatus}
              onChange={(event) => setStatus(event.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {saveState.message && <p role="status" className="min-w-0 flex-1 truncate text-xs text-ink-muted">{saveState.message}</p>}
        <Button size="sm" isLoading={saveState.isSaving} disabled={!hasChanges} onClick={saveChanges} className="ml-auto min-w-28">
          {copy.saveStatus}
        </Button>
      </div>
    </div>
  );

  return (
    <SideSheet
      isOpen={Boolean(referenceCode)}
      onClose={() => {
        setStatus('');
        setAssignee(null);
        setSaveState({ isSaving: false, message: '' });
        onClose();
      }}
      title={request?.FullName ?? referenceCode ?? ''}
      closeLabel={copy.close}
      footer={footer}
      actions={
        fullHref && (
          <LocaleLink href={fullHref} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-semibold text-primary-dark transition-colors duration-(--dur-150) hover:bg-primary-50">
            <span className="hidden sm:inline">{copy.openFull}</span>
            <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={2} />
          </LocaleLink>
        )
      }
    >
      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : request ? (
        <div className="space-y-5">
          {/* Summary strip */}
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.Status} />
            <span className="rounded-full bg-card-dim px-2.5 py-0.5 text-xs font-medium text-ink">{labels.service(request.ServiceCategory)}</span>
            {request.Subtype && (
              <span className="rounded-full bg-card-dim px-2.5 py-0.5 text-xs font-medium text-ink">
                {dictionary.intake.subtypes[request.Subtype]?.label ?? request.Subtype}
              </span>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className={sheetLabelClass}>{dictionary.admin.requests.columns.reference}</dt>
              <dd className="mt-0.5 font-mono text-[13px] font-semibold">{request.ReferenceCode}</dd>
            </div>
            <div>
              <dt className={sheetLabelClass}>{copy.received}</dt>
              <dd className="tabular mt-0.5">{format.dateTime(request.createdAt)}</dd>
            </div>
          </dl>

          {/* Contact: tap to email or call */}
          <section>
            <h3 className={sheetLabelClass}>{copy.contact}</h3>
            <ul className="mt-2 divide-y divide-line rounded-card border border-line">
              {[
                request.Email && { href: `mailto:${request.Email}`, icon: Mail, text: request.Email },
                request.Phone && { href: `tel:${request.Phone.replace(/[^\d+]/g, '')}`, icon: Phone, text: request.Phone },
              ]
                .filter(Boolean)
                .map(({ href, icon: Icon, text }) => (
                  <li key={href}>
                    <a href={href} className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-(--dur-150) hover:bg-primary-50">
                      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary-dark" strokeWidth={1.75} />
                      <span className="tabular min-w-0 flex-1 truncate font-medium">{text}</span>
                    </a>
                  </li>
                ))}
            </ul>
          </section>

          <section>
            <h3 className={sheetLabelClass}>{copy.matter}</h3>
            <p className="mt-2 whitespace-pre-wrap rounded-card border-l-2 border-primary bg-card-dim/70 px-4 py-3 text-sm leading-6">{request.Description}</p>
          </section>

          {/* Files: count only here; previews open on the full request page */}
          <LocaleLink
            href={fullHref}
            className="flex items-center gap-2.5 rounded-card border border-line px-3 py-2.5 text-sm transition-colors duration-(--dur-150) hover:border-primary/50 hover:bg-primary-50"
          >
            <Paperclip aria-hidden="true" className="size-4 text-primary-dark" strokeWidth={2} />
            <span className="flex-1 font-medium">{documentCount > 0 ? fileLabel : copy.noDocuments}</span>
            <ArrowUpRight aria-hidden="true" className="size-4 text-ink-muted" strokeWidth={2} />
          </LocaleLink>
        </div>
      ) : null}
    </SideSheet>
  );
}
