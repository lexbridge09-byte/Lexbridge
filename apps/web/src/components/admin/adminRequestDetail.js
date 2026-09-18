'use client';

import { useState } from 'react';
import { REQUEST_STATUSES } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, ADMIN_LINK_CLASS, AdminBackLink, AdminPanel } from '@/components/admin/adminStyles';
import { DocumentList } from '@/components/documentList';
import { DocumentUpload } from '@/components/documentUpload';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { RequestStatusBadge } from '@/components/statusBadge';
import { StatusTimeline } from '@/components/statusTimeline';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

function deriveClientWhatsAppHref(phone) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}`;
}

function RequestUpdateForm({ request, admins, onSaved }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.requestDetail.update;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {};
    const status = String(formData.get('Status') ?? '');
    const note = String(formData.get('Note') ?? '').trim();
    const assignedTo = String(formData.get('AssignedTo') ?? '');
    const currentAssignedTo = request.AssignedTo?._id ?? request.AssignedTo ?? '';

    if (status && status !== request.Status) body.Status = status;
    if (note) body.Note = note;
    if (assignedTo !== String(currentAssignedTo)) body.AssignedTo = assignedTo || null;

    if (Object.keys(body).length === 0) {
      setMessage({ tone: 'error', text: copy.nothingChanged });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await requestApi(`/admin/service-requests/${encodeURIComponent(request.ReferenceCode)}`, { method: 'PATCH', body });
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
    <AdminPanel as="form" title={copy.title} onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div>
          <label htmlFor="update-status" className={ADMIN_LABEL_CLASS}>
            {common.status}
          </label>
          <select id="update-status" name="Status" defaultValue={request.Status} className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labels.requestStatus(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="update-note" className={ADMIN_LABEL_CLASS}>
            {copy.note}
          </label>
          <textarea
            id="update-note"
            name="Note"
            rows={3}
            maxLength={1000}
            aria-describedby="update-note-hint"
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          />
          <p id="update-note-hint" className="mt-1 text-xs text-ink-muted">
            {copy.noteHint}
          </p>
        </div>
        <div>
          <label htmlFor="update-assigned" className={ADMIN_LABEL_CLASS}>
            {copy.assignedTo}
          </label>
          <select
            id="update-assigned"
            name="AssignedTo"
            defaultValue={request.AssignedTo?._id ?? request.AssignedTo ?? ''}
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          >
            <option value="">{dictionary.admin.requests.unassigned}</option>
            {admins.map((admin) => (
              <option key={admin._id} value={admin._id}>
                {admin.FullName || admin.Email}
              </option>
            ))}
          </select>
        </div>
        <FormMessage message={message} />
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? common.saving : copy.save}
        </Button>
      </div>
    </AdminPanel>
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

export function AdminRequestDetail({ referenceCode }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.requestDetail;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const requestData = useApiData(`/admin/service-requests/${encodeURIComponent(referenceCode)}`);
  const adminsData = useApiData('/admin/users?role=admin&limit=100');
  const [savedMessage, setSavedMessage] = useState('');

  if (requestData.isLoading && !requestData.data) return <LoadingNote />;
  if (requestData.error?.status === 404) {
    return (
      <div>
        <p className="text-ink-muted">{copy.notFound(referenceCode)}</p>
        <div className="mt-3">
          <AdminBackLink href="/admin/requests">{copy.back}</AdminBackLink>
        </div>
      </div>
    );
  }
  if (requestData.error) return <ErrorNote error={requestData.error} onRetry={requestData.reload} />;

  const request = requestData.data?.request;
  if (!request) return null;
  const documents = requestData.data?.documents ?? [];
  const admins = adminsData.data?.items ?? [];
  const clientWhatsAppHref = request.WhatsAppOptIn ? deriveClientWhatsAppHref(request.Phone) : '';
  const serviceLabel = `${labels.service(request.ServiceCategory)}${request.Subtype ? `, ${request.Subtype}` : ''}`;

  function handleSaved() {
    setSavedMessage(copy.saved);
    requestData.reload();
  }

  return (
    <div>
      <AdminBackLink href="/admin/requests">{copy.breadcrumb}</AdminBackLink>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-h3 text-ink">{request.ReferenceCode}</h1>
        <RequestStatusBadge status={request.Status} />
      </div>
      <p className="mt-0.5 text-sm text-ink-muted">
        {copy.meta(serviceLabel, format.dateTime(request.createdAt), labels.requestSource(request.Source))}
      </p>

      {savedMessage && (
        <div className="mt-3">
          <FormMessage message={{ tone: 'success', text: savedMessage }} />
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <AdminPanel as="section" title={copy.clientTitle}>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <DetailItem label={copy.name}>{request.FullName}</DetailItem>
              <DetailItem label={copy.email}>
                <a href={`mailto:${request.Email}`} className={`break-all ${ADMIN_LINK_CLASS}`}>
                  {request.Email}
                </a>
              </DetailItem>
              <DetailItem label={copy.phone}>
                <a href={`tel:${request.Phone.replace(/[^\d+]/g, '')}`} className={ADMIN_LINK_CLASS}>
                  {request.Phone}
                </a>
              </DetailItem>
              <DetailItem label={copy.whatsApp}>
                {request.WhatsAppOptIn ? copy.optedIn : copy.notOptedIn}
                {clientWhatsAppHref && (
                  <a
                    href={`${clientWhatsAppHref}?text=${encodeURIComponent(copy.chatGreeting(request.FullName, request.ReferenceCode))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`ml-3 ${ADMIN_LINK_CLASS}`}
                  >
                    {copy.openChat}
                  </a>
                )}
              </DetailItem>
              <DetailItem label={copy.consent}>{request.ConsentGiven ? format.dateTime(request.consentedAt) : copy.no}</DetailItem>
              <DetailItem label={copy.account}>{request.Client ? copy.linkedAccount : copy.guest}</DetailItem>
            </dl>
          </AdminPanel>

          <AdminPanel as="section" title={copy.requirement}>
            <p className="max-w-[70ch] whitespace-pre-line text-sm leading-6 text-ink">{request.Description}</p>
          </AdminPanel>

          <AdminPanel as="section" title={copy.history}>
            <StatusTimeline entries={request.StatusHistory} />
          </AdminPanel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <RequestUpdateForm key={request.updatedAt} request={request} admins={admins} onSaved={handleSaved} />

          <AdminPanel as="section" title={copy.documents}>
            <DocumentList documents={documents} emptyText={copy.noDocuments} />
          </AdminPanel>
          <DocumentUpload
            endpoint="/admin/documents"
            requestReference={request.ReferenceCode}
            title={copy.shareTitle}
            submitLabel={copy.shareSubmit}
            onUploaded={requestData.reload}
          />
        </div>
      </div>
    </div>
  );
}
