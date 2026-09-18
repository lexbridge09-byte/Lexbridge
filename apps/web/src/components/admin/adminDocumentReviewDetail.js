'use client';

import { useDictionary } from '@/brand/localeContext';
import { ADMIN_LINK_CLASS, AdminBackLink, AdminPanel } from '@/components/admin/adminStyles';
import { DocumentReviewReport } from '@/components/documentReview/documentReviewReport';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { DocumentReviewStatusBadge, RiskBadge } from '@/components/statusBadge';
import { useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

function DetailItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

export function AdminDocumentReviewDetail({ referenceCode }) {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.documentReviewDetail;
  const reportCopy = dictionary.documentReview.report;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData(`/admin/document-reviews/${encodeURIComponent(referenceCode)}`);

  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const review = data?.review;
  if (!review) return null;

  return (
    <div>
      <AdminBackLink href="/admin/document-reviews">{copy.breadcrumb}</AdminBackLink>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-h3 text-ink">{review.ReferenceCode}</h1>
        <DocumentReviewStatusBadge status={review.Status} />
        <RiskBadge level={review.RiskLevel} />
      </div>
      <p className="mt-0.5 text-sm text-ink-muted">{copy.meta(format.dateTime(review.createdAt))}</p>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="review-report-title" className="order-2 lg:order-1">
          <h2 id="review-report-title" className="mb-3 text-h4 text-ink">
            {copy.reportTitle}
          </h2>
          {review.Report ? <DocumentReviewReport report={review.Report} /> : <p className="text-sm text-ink-muted">{copy.noReport}</p>}
        </section>

        <AdminPanel className="order-1 lg:sticky lg:top-24 lg:order-2">
          <dl className="space-y-3">
            <DetailItem label={copy.owner}>{review.Owner?.FullName ? `${review.Owner.FullName}, ${review.Owner.Email}` : review.Owner?.Email ?? '—'}</DetailItem>
            <DetailItem label={copy.file}>
              {review.OriginalName} ({format.fileSize(review.SizeBytes)})
              {review.FileDeletedAt && <span className="block text-xs text-ink-muted">{copy.fileDeleted}</span>}
            </DetailItem>
            <DetailItem label={copy.pages}>{review.PageCountEstimate || '—'}</DetailItem>
            <DetailItem label={copy.attempts}>{review.Attempts ?? 0}</DetailItem>
            <DetailItem label={copy.tokens}>
              {copy.tokensValue(format.number(review.TokenUsage?.InputTokens ?? 0), format.number(review.TokenUsage?.OutputTokens ?? 0))}
            </DetailItem>
            {review.Status === 'failed' && (
              <DetailItem label={copy.lastError}>
                {review.FailureReason === 'declined' ? reportCopy.declined : review.LastError || reportCopy.error}
              </DetailItem>
            )}
            <DetailItem label={copy.request}>
              {review.ServiceRequestReference ? (
                <LocaleLink href={`/admin/requests/${review.ServiceRequestReference}`} className={ADMIN_LINK_CLASS}>
                  {review.ServiceRequestReference}
                </LocaleLink>
              ) : (
                copy.none
              )}
            </DetailItem>
          </dl>
        </AdminPanel>
      </div>
    </div>
  );
}
