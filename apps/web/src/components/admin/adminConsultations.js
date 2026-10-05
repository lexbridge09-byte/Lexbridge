'use client';

import { CONSULTATION_STATUSES, getDisplayableIntakeDetails } from '@lexbridge/shared';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, AdminPageHeading, AdminTable, ADMIN_TD_CLASS, ADMIN_TH_CLASS } from '@/components/admin/adminStyles';
import { ReferenceCodeTag } from '@/components/copyButton';
import { IntakeDetailsPanel } from '@/components/intakeDetailsPanel';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { Pagination } from '@/components/pagination';
import { ConsultationStatusBadge } from '@/components/statusBadge';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 20;

function DetailItem({ label, children }) {
  return (
    <>
      <dt className="text-xs font-semibold text-ink-muted sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{children}</dd>
    </>
  );
}

// Status, meeting link and internal note — shown inside the Manage popup
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
    <form onSubmit={handleSubmit} className="space-y-3">
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
      <div>
        <label htmlFor={`${idPrefix}-note`} className={ADMIN_LABEL_CLASS}>
          {copy.note}
        </label>
        <textarea
          id={`${idPrefix}-note`}
          name="AdminNote"
          rows={2}
          defaultValue={consultation.AdminNote ?? ''}
          className={`mt-1 resize-none ${ADMIN_CONTROL_CLASS}`}
        />
      </div>
      <FormMessage message={message} />
      <Button type="submit" size="sm" disabled={isSaving} className="w-full">
        {isSaving ? common.saving : copy.save}
      </Button>
    </form>
  );
}

// Booking facts + the client's topic answers + the editor, in one Manage popup
function ConsultationManageModal({ consultation, onClose, onSaved }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.consultations;
  const format = useFormatters();
  const hasTopicDetails = getDisplayableIntakeDetails(consultation.IntakeSubtype, consultation.IntakeDetails).length > 0;

  return (
    <Modal title={copy.detailsTitle} onClose={onClose}>
      <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <DetailItem label={copy.referenceLabel}>
          <ReferenceCodeTag code={consultation.ReferenceCode} />
        </DetailItem>
        <DetailItem label={copy.email}>
          {consultation.Client?.Email ? (
            <a href={`mailto:${consultation.Client.Email}`} className="break-all font-semibold text-primary underline-offset-4 hover:underline">
              {consultation.Client.Email}
            </a>
          ) : (
            copy.notAvailable
          )}
        </DetailItem>
        <DetailItem label={copy.phone}>{consultation.Phone || consultation.Client?.Phone || copy.notAvailable}</DetailItem>
        <DetailItem label={copy.duration}>{copy.minutes(consultation.DurationMinutes)}</DetailItem>
        <DetailItem label={copy.whatsApp}>{consultation.WhatsAppOptIn ? copy.optedIn : copy.notOptedIn}</DetailItem>
        <DetailItem label={copy.booked}>{format.dateTime(consultation.createdAt)}</DetailItem>
      </dl>

      {consultation.Description && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-card-dim px-4 py-3 text-sm leading-6 text-ink">{consultation.Description}</p>
      )}

      {hasTopicDetails && (
        <div className="mt-3 rounded-xl border border-line bg-card-dim/60 p-3">
          <p className="text-xs font-semibold text-ink-muted">{dictionary.intake.detailsTitle}</p>
          <div className="mt-2">
            <IntakeDetailsPanel subtype={consultation.IntakeSubtype} details={consultation.IntakeDetails} />
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <ConsultationEditor consultation={consultation} onSaved={onSaved} />
      </div>
    </Modal>
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
  const [managedReference, setManagedReference] = useState(null);
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
  if (status) params.set('status', status);
  const { data, error, isLoading, reload } = useApiData(`/admin/consultations?${params}`);
  const items = data?.items ?? [];
  const managedConsultation = items.find((consultation) => consultation.ReferenceCode === managedReference);

  function topicLabel(consultation) {
    const parts = [labels.consultationType(consultation.ConsultationType), labels.consultationMode(consultation.Mode)];
    if (consultation.IntakeSubtype) {
      parts.push(dictionary.intake.subtypes[consultation.IntakeSubtype]?.label ?? consultation.IntakeSubtype);
    }
    return parts.join(' · ');
  }

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <div className="mb-3 max-w-xs">
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
          <AdminTable>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.when}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.client}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.topic}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{common.status}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  <span className="sr-only">{copy.detailsTitle}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {items.map((consultation) => (
                <tr key={consultation.ReferenceCode} className="hover:bg-card-hover">
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>
                    <span className="block font-semibold text-ink">{format.day(consultation.StartsAt)}</span>
                    <span className="block text-xs text-ink-muted">{format.time(consultation.StartsAt)} IST</span>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <span className="block">{consultation.Client?.FullName || copy.clientFallback}</span>
                    <span className="block text-xs text-ink-muted">{consultation.Client?.Email || copy.notAvailable}</span>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{topicLabel(consultation)}</td>
                  <td className={ADMIN_TD_CLASS}>
                    <ConsultationStatusBadge status={consultation.Status} />
                  </td>
                  <td className={`${ADMIN_TD_CLASS} text-right`}>
                    <Button size="sm" variant="secondary" onClick={() => setManagedReference(consultation.ReferenceCode)}>
                      {copy.manageCta}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination page={data.page ?? page} limit={data.limit ?? PAGE_LIMIT} total={data.total} onPageChange={setPage} />
        </>
      )}

      {managedConsultation && (
        <ConsultationManageModal
          consultation={managedConsultation}
          onClose={() => setManagedReference(null)}
          onSaved={() => {
            reload();
            setManagedReference(null);
          }}
        />
      )}
    </div>
  );
}
