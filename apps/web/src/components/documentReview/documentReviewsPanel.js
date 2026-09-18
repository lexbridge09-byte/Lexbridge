'use client';

import { ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { DocumentReviewDropzone } from '@/components/documentReview/documentReviewDropzone';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { DocumentReviewStatusBadge, RiskBadge } from '@/components/statusBadge';
import { Card } from '@/components/ui';
import { useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

const POLL_INTERVAL_MS = 3000;
const PENDING_STATUSES = ['queued', 'processing'];

export function DocumentReviewsPanel() {
  const copy = useDictionary().documentReview.list;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/document-reviews/mine');
  const reviews = data?.reviews ?? [];
  const hasPendingReviews = reviews.some((review) => PENDING_STATUSES.includes(review.Status));

  useEffect(() => {
    if (!hasPendingReviews) return undefined;
    const timer = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasPendingReviews, reload]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h3 text-ink">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.intro}</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="order-1 lg:order-2">
          <DocumentReviewDropzone allowance={data?.allowance} />
        </div>
        <Card as="section" padding="none" aria-label={copy.title} className="order-2 lg:order-1">
          {isLoading && !data ? (
            <div className="p-4">
              <LoadingNote />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorNote error={error} onRetry={reload} />
            </div>
          ) : reviews.length === 0 ? (
            <p className="p-5 text-ink-muted">{copy.empty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {reviews.map((review) => (
                <li key={review.ReferenceCode}>
                  <LocaleLink href={`/dashboard/document-reviews/${review.ReferenceCode}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{review.OriginalName}</p>
                      <p className="text-xs text-ink-muted">{copy.meta(review.ReferenceCode, format.date(review.createdAt))}</p>
                    </div>
                    {review.Status === 'completed' ? <RiskBadge level={review.RiskLevel} /> : <DocumentReviewStatusBadge status={review.Status} />}
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={2} />
                  </LocaleLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
