'use client';

import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { DocumentList } from '@/components/documentList';
import { DocumentUpload } from '@/components/documentUpload';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { Card } from '@/components/ui';
import { useCatalogLabels } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function DocumentsPanel() {
  const copy = useDictionary().dashboard.documents;
  const labels = useCatalogLabels();
  const documentsData = useApiData('/documents/mine');
  const requestsData = useApiData('/service-requests/mine');
  const consultationsData = useApiData(isFeatureEnabled('consultationBooking') ? '/consultations/mine' : null);

  const referenceOptions = [
    ...(requestsData.data?.requests ?? []).map((request) => ({
      value: request.ReferenceCode,
      label: copy.referenceOption(request.ReferenceCode, request.Subtype || labels.service(request.ServiceCategory)),
    })),
    ...(consultationsData.data?.consultations ?? []).map((consultation) => ({
      value: consultation.ReferenceCode,
      label: copy.referenceOption(consultation.ReferenceCode, labels.consultationType(consultation.ConsultationType)),
    })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h3 text-ink">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.intro}</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card as="section" padding="md" aria-labelledby="documents-heading">
          <h2 id="documents-heading" className="mb-3 text-h4 text-ink">
            {copy.yourDocuments}
          </h2>
          {documentsData.isLoading && !documentsData.data ? (
            <LoadingNote />
          ) : documentsData.error ? (
            <ErrorNote error={documentsData.error} onRetry={documentsData.reload} />
          ) : (
            <DocumentList documents={documentsData.data?.documents} emptyText={copy.empty} showReference />
          )}
        </Card>
        <DocumentUpload referenceOptions={referenceOptions} onUploaded={documentsData.reload} />
      </div>
    </div>
  );
}
