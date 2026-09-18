'use client';

import { ChevronLeft } from 'lucide-react';
import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { DocumentList } from '@/components/documentList';
import { DocumentUpload } from '@/components/documentUpload';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { RequestStatusBadge } from '@/components/statusBadge';
import { StatusTimeline } from '@/components/statusTimeline';
import { ButtonLink, Card } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function RequestDetail({ referenceCode }) {
  const copy = useDictionary().dashboard.requestDetail;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const isDocumentsEnabled = isFeatureEnabled('documentUploads');
  const requestData = useApiData(`/service-requests/mine/${encodeURIComponent(referenceCode)}`);
  const documentsData = useApiData(isDocumentsEnabled ? '/documents/mine' : null);

  if (requestData.isLoading && !requestData.data) return <LoadingNote />;

  if (requestData.error?.status === 404) {
    return (
      <Card padding="md">
        <h1 className="text-h3 text-ink">{copy.notFoundTitle}</h1>
        <p className="mt-1 text-ink-muted">{copy.notFoundBody}</p>
        <ButtonLink href="/dashboard/requests" variant="secondary" size="sm" className="mt-4">
          {copy.backToRequests}
        </ButtonLink>
      </Card>
    );
  }

  if (requestData.error) return <ErrorNote error={requestData.error} onRetry={requestData.reload} />;

  const request = requestData.data?.request;
  if (!request) return null;

  const requestDocuments = (documentsData.data?.documents ?? []).filter((document) => document.RequestReference === request.ReferenceCode);

  return (
    <div className="space-y-5">
      <div>
        <LocaleLink href="/dashboard/requests" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {copy.breadcrumb}
        </LocaleLink>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-h3 text-ink">{request.Subtype || labels.service(request.ServiceCategory)}</h1>
          <RequestStatusBadge status={request.Status} />
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.meta(request.ReferenceCode, format.dateTime(request.createdAt))}</p>
      </div>

      <div className={`grid items-start gap-5 ${isDocumentsEnabled ? 'lg:grid-cols-[1.2fr_1fr]' : ''}`}>
        <Card as="section" padding="md" aria-labelledby="request-updates">
          <h2 id="request-updates" className="mb-4 text-h4 text-ink">
            {copy.updates}
          </h2>
          <StatusTimeline entries={request.StatusHistory} />

          <details className="mt-6 border-t border-line pt-4">
            <summary className="cursor-pointer text-h4 text-ink">{copy.description}</summary>
            <p className="mt-2 max-w-[65ch] whitespace-pre-line text-sm leading-6 text-ink-muted">{request.Description}</p>
          </details>
        </Card>

        {isDocumentsEnabled && (
          <section aria-labelledby="request-documents" className="space-y-4">
            <Card padding="md">
              <h2 id="request-documents" className="mb-3 text-h4 text-ink">
                {copy.documents}
              </h2>
              {documentsData.error ? (
                <ErrorNote error={documentsData.error} onRetry={documentsData.reload} />
              ) : (
                <DocumentList documents={requestDocuments} emptyText={copy.noDocuments} />
              )}
            </Card>
            <DocumentUpload requestReference={request.ReferenceCode} title={copy.shareTitle} onUploaded={documentsData.reload} />
          </section>
        )}
      </div>
    </div>
  );
}
