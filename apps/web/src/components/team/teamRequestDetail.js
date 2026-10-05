'use client';

import { useState } from 'react';
import { LAWYER_ALLOWED_STATUSES } from '@lexbridge/shared';
import { ChevronLeft } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { DocumentList } from '@/components/documentList';
import { DocumentUpload } from '@/components/documentUpload';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { RequestStatusBadge } from '@/components/statusBadge';
import { StatusTimeline } from '@/components/statusTimeline';
import { Button, ButtonLink, Card } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

function DetailItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

function StatusUpdateForm({ request, onSaved }) {
  const dictionary = useDictionary();
  const copy = dictionary.team.detail;
  const labels = useCatalogLabels();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const status = String(formData.get('Status') ?? '');
    const note = String(formData.get('Note') ?? '').trim();

    if (status === request.Status && !note) {
      setMessage({ tone: 'error', text: copy.nothingChanged });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await requestApi(`/team/requests/${encodeURIComponent(request.ReferenceCode)}/status`, {
        method: 'PATCH',
        body: { Status: status, Note: note },
      });
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
    <Card as="form" padding="md" onSubmit={handleSubmit}>
      <h2 className="text-h4 text-ink">{copy.statusTitle}</h2>
      <p className="mt-0.5 text-sm text-ink-muted">{copy.statusHint}</p>
      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="team-status" className="block text-sm font-semibold text-ink">
            {dictionary.admin.common.status}
          </label>
          <select id="team-status" name="Status" defaultValue={request.Status} className="mt-1 control">
            {LAWYER_ALLOWED_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labels.requestStatus(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="team-note" className="block text-sm font-semibold text-ink">
            {copy.note}
          </label>
          <textarea id="team-note" name="Note" rows={3} maxLength={1000} className="mt-1 control" />
          <p className="mt-1 text-xs text-ink-muted">{copy.noteHint}</p>
        </div>
        <FormMessage message={message} />
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? dictionary.admin.common.saving : copy.save}
        </Button>
      </div>
    </Card>
  );
}

export function TeamRequestDetail({ referenceCode }) {
  const dictionary = useDictionary();
  const copy = dictionary.team.detail;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [savedMessage, setSavedMessage] = useState(false);
  const detailData = useApiData(`/team/requests/${encodeURIComponent(referenceCode)}`);

  if (detailData.isLoading && !detailData.data) return <LoadingNote />;

  if (detailData.error?.status === 404) {
    return (
      <Card padding="md">
        <h1 className="text-h3 text-ink">{copy.notFound}</h1>
        <ButtonLink href="/team" variant="secondary" size="sm" className="mt-4">
          {copy.back}
        </ButtonLink>
      </Card>
    );
  }
  if (detailData.error) return <ErrorNote error={detailData.error} onRetry={detailData.reload} />;

  const request = detailData.data?.request;
  if (!request) return null;
  const documents = detailData.data?.documents ?? [];
  const sourceDocuments = documents.filter((document) => document.Kind !== 'deliverable');
  const deliverables = documents.filter((document) => document.Kind === 'deliverable');

  return (
    <div className="space-y-5">
      <div>
        <LocaleLink href="/team" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {copy.breadcrumb}
        </LocaleLink>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-h3 text-ink">{request.ReferenceCode}</h1>
          <RequestStatusBadge status={request.Status} />
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">{dictionary.team.requests.requestMeta(request.ReferenceCode, format.dateTime(request.createdAt))}</p>
      </div>

      {savedMessage && <FormMessage message={{ tone: 'success', text: copy.delivered }} />}

      <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Card as="section" padding="md">
            <h2 className="text-h4 text-ink">{copy.clientTitle}</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <DetailItem label={copy.name}>{request.FullName}</DetailItem>
              <DetailItem label={copy.email}>{request.Email}</DetailItem>
              <DetailItem label={copy.phone}>{request.Phone}</DetailItem>
            </dl>
          </Card>

          <Card as="section" padding="md">
            <h2 className="text-h4 text-ink">{copy.requirement}</h2>
            <p className="mt-2 max-w-[70ch] whitespace-pre-line text-sm leading-6 text-ink">{request.Description}</p>
          </Card>

          <Card as="section" padding="md">
            <h2 className="mb-3 text-h4 text-ink">{copy.documents}</h2>
            <DocumentList documents={sourceDocuments} emptyText={copy.noDocuments} />
          </Card>

          <Card as="section" padding="md">
            <h2 className="mb-3 text-h4 text-ink">{copy.deliverables}</h2>
            <DocumentList documents={deliverables} emptyText={copy.noDeliverables} />
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <StatusUpdateForm key={request.updatedAt} request={request} onSaved={() => detailData.reload()} />
          <DocumentUpload
            endpoint={`/team/requests/${encodeURIComponent(request.ReferenceCode)}/deliverable`}
            requestReference={request.ReferenceCode}
            title={copy.deliverableTitle}
            submitLabel={copy.deliverableSubmit}
            onUploaded={() => {
              setSavedMessage(true);
              detailData.reload();
            }}
          />
          <Card as="section" padding="md">
            <h2 className="mb-3 text-h4 text-ink">{copy.updates}</h2>
            <StatusTimeline entries={request.StatusHistory} />
          </Card>
        </div>
      </div>
    </div>
  );
}
