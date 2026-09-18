'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { CONSULTATION_STATUSES } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, ADMIN_LINK_CLASS, AdminPageHeading } from '@/components/admin/adminStyles';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { Pagination } from '@/components/pagination';
import { ConsultationStatusBadge } from '@/components/statusBadge';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 20;

function ConsultationEditor({ consultation, onSaved }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.consultations.editor;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const idPrefix = `consultation-${consultation.ReferenceCode}`;

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {};
    const status = String(formData.get('Status') ?? '');
    const meetingLink = String(formData.get('MeetingLink') ?? '').trim();
    const adminNote = String(formData.get('AdminNote') ?? '').trim();
    if (status !== consultation.Status) body.Status = status;
    if (meetingLink !== (consultation.MeetingLink ?? '')) body.MeetingLink = meetingLink;
    if (adminNote !== (consultation.AdminNote ?? '')) body.AdminNote = adminNote;

    if (Object.keys(body).length === 0) {
      setMessage({ tone: 'error', text: copy.nothingChanged });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await requestApi(`/admin/consultations/${encodeURIComponent(consultation.ReferenceCode)}`, { method: 'PATCH', body });
      setMessage({ tone: 'success', text: copy.saved });
      onSaved();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-status`} className={ADMIN_LABEL_CLASS}>
          {common.status}
        </label>
        <select id={`${idPrefix}-status`} name="Status" defaultValue={consultation.Status} className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
          {CONSULTATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {labels.consultationStatus(status)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">{copy.statusHint}</p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-link`} className={ADMIN_LABEL_CLASS}>
          {copy.meetingLink} {consultation.Mode === 'video' ? '' : copy.videoOnly}
        </label>
        <input
          id={`${idPrefix}-link`}
          name="MeetingLink"
          type="url"
          placeholder={copy.meetingPlaceholder}
          defaultValue={consultation.MeetingLink ?? ''}
          className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
        />
        <p className="mt-1 text-xs text-ink-muted">{copy.meetingHint}</p>
      </div>
      <div className="md:col-span-2">
        <label htmlFor={`${idPrefix}-note`} className={ADMIN_LABEL_CLASS}>
          {copy.note}
        </label>
        <textarea id={`${idPrefix}-note`} name="AdminNote" rows={2} defaultValue={consultation.AdminNote ?? ''} className={`mt-1 ${ADMIN_CONTROL_CLASS}`} />
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? common.saving : copy.save}
        </Button>
        <FormMessage message={message} />
      </div>
    </form>
  );
}

function DetailItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

export function AdminConsultations() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.consultations;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [status, setStatus] = useState('scheduled');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
  if (status) params.set('status', status);
  const { data, error, isLoading, reload } = useApiData(`/admin/consultations?${params}`);
  const items = data?.items ?? [];

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <div className="mb-4 max-w-xs">
        <label htmlFor="consultation-status-filter" className={ADMIN_LABEL_CLASS}>
          {common.status}
        </label>
        <select
          id="consultation-status-filter"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
        >
          <option value="">{common.allStatuses}</option>
          {CONSULTATION_STATUSES.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {labels.consultationStatus(statusOption)}
            </option>
          ))}
        </select>
      </div>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((consultation) => (
              <li key={consultation.ReferenceCode}>
                <details className="group rounded-xl border border-line bg-white open:shadow-sm">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {copy.when(format.day(consultation.StartsAt), format.time(consultation.StartsAt))}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {copy.summary(
                          consultation.Client?.FullName || consultation.Client?.Email || copy.clientFallback,
                          labels.consultationType(consultation.ConsultationType),
                          labels.consultationMode(consultation.Mode),
                          consultation.ReferenceCode,
                        )}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <ConsultationStatusBadge status={consultation.Status} />
                      <ChevronDown aria-hidden="true" className="size-4 text-primary transition-transform group-open:rotate-180" strokeWidth={2} />
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
                      <DetailItem label={copy.email}>
                        {consultation.Client?.Email ? (
                          <a href={`mailto:${consultation.Client.Email}`} className={`break-all ${ADMIN_LINK_CLASS}`}>
                            {consultation.Client.Email}
                          </a>
                        ) : (
                          copy.notAvailable
                        )}
                      </DetailItem>
                      <DetailItem label={copy.phone}>{consultation.Phone || consultation.Client?.Phone || copy.notAvailable}</DetailItem>
                      <DetailItem label={copy.booked}>{format.dateTime(consultation.createdAt)}</DetailItem>
                      <DetailItem label={copy.duration}>{copy.minutes(consultation.DurationMinutes)}</DetailItem>
                      <DetailItem label={copy.whatsApp}>{consultation.WhatsAppOptIn ? copy.optedIn : copy.notOptedIn}</DetailItem>
                    </dl>
                    {consultation.Description && <p className="mt-3 max-w-[70ch] whitespace-pre-line text-sm leading-6 text-ink">{consultation.Description}</p>}
                    <ConsultationEditor key={consultation.updatedAt ?? consultation.Status} consultation={consultation} onSaved={reload} />
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
