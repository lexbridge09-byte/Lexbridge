'use client';

import { useState } from 'react';
import { LAWYER_ALLOWED_STATUSES } from '@lexbridge/shared';
import { ChevronLeft, PenLine, Upload } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { DocumentList } from '@/components/documentList';
import { DocumentUpload } from '@/components/documentUpload';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { ReferenceCodeTag } from '@/components/copyButton';
import { RequestStatusBadge } from '@/components/statusBadge';
import { StatusTimeline } from '@/components/statusTimeline';
import { Button, ButtonLink, Card } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

// dt/dd fragments inside a two-column dl grid: labels align down one column, values down the next
function DetailItem({ label, children }) {
  return (
    <>
      <dt className="text-xs font-semibold text-ink-muted sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{children}</dd>
    </>
  );
}

function StatusUpdateForm({ request, onSaved, isBare = false }) {
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

  const content = (
      <div className="space-y-3">
        {!isBare && (
          <>
            <h2 className="text-h4 text-ink">{copy.statusTitle}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">{copy.statusHint}</p>
          </>
        )}
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
          <textarea id="team-note" name="Note" rows={3} maxLength={1000} className="mt-1 resize-none control" />
          <p className="mt-1 text-xs text-ink-muted">{copy.noteHint}</p>
        </div>
        <FormMessage message={message} />
        <Button type="submit" size="sm" disabled={isSaving} className="w-full">
          {isSaving ? dictionary.admin.common.saving : copy.save}
        </Button>
      </div>
  );

  if (isBare) return <form onSubmit={handleSubmit}>{content}</form>;
  return (
    <Card as="form" padding="md" onSubmit={handleSubmit}>
      {content}
    </Card>
  );
}

export function TeamRequestDetail({ referenceCode }) {
  const dictionary = useDictionary();
  const copy = dictionary.team.detail;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [savedMessage, setSavedMessage] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const detailData = useApiData(`/team/requests/${encodeURIComponent(referenceCode)}`);

  if (detailData.isLoading && !detailData.data) return <LoadingNote />;

  if (detailData.error?.status === 404) {
    return (
      <Card padding="md">
        <h1 className="text-h3 text-on-canvas">{copy.notFound}</h1>
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
        <div className="mt-2">
          <h1 className="sr-only">{request.ReferenceCode}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <ReferenceCodeTag code={request.ReferenceCode} size="lg" />
            <RequestStatusBadge status={request.Status} />
          </div>
          <p className="mt-1.5 text-sm text-on-canvas-muted">{dictionary.team.requests.requestMeta(request.ReferenceCode, format.dateTime(request.createdAt))}</p>
        </div>
      </div>

      {savedMessage && <FormMessage message={{ tone: 'success', text: copy.delivered }} />}

      <div>
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0 lg:pr-[21.5rem]">
          <Card as="section" padding="md">
            <h2 className="text-h4 text-ink">{copy.clientTitle}</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
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

        {/* Pinned right edge: two action buttons open popups, history fills the remaining height */}
        <div className="mt-4 flex flex-col gap-3 lg:fixed lg:bottom-0 lg:right-0 lg:top-16 lg:mt-0 lg:w-[20rem] lg:border-l lg:border-line-canvas lg:bg-surface-alt lg:p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" className="w-full" onClick={() => setActiveModal('update')}>
              <PenLine aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {dictionary.admin.requestDetail.updateCta}
            </Button>
            <Button size="sm" variant="secondary" className="w-full" onClick={() => setActiveModal('upload')}>
              <Upload aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {dictionary.admin.requestDetail.uploadCta}
            </Button>
          </div>
          <Card as="section" padding="md" className="flex min-h-0 flex-1 flex-col">
            <h2 className="mb-3 text-h4 text-ink">{copy.updates}</h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <StatusTimeline entries={request.StatusHistory} />
            </div>
          </Card>
        </div>

        {activeModal === 'update' && (
          <Modal title={copy.statusTitle} onClose={() => setActiveModal(null)}>
            <StatusUpdateForm
              key={request.updatedAt}
              request={request}
              isBare
              onSaved={() => {
                detailData.reload();
                setActiveModal(null);
              }}
            />
          </Modal>
        )}
        {activeModal === 'upload' && (
          <Modal title={copy.deliverableTitle} onClose={() => setActiveModal(null)}>
            <DocumentUpload
              endpoint={`/team/requests/${encodeURIComponent(request.ReferenceCode)}/deliverable`}
              requestReference={request.ReferenceCode}
              isBare
              submitLabel={copy.deliverableSubmit}
              onUploaded={() => {
                setSavedMessage(true);
                detailData.reload();
                setActiveModal(null);
              }}
            />
          </Modal>
        )}
      </div>
    </div>
  );
}
