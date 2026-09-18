'use client';

import { ChevronRight } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { RequestStatusBadge } from '@/components/statusBadge';
import { Card } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function RequestsList() {
  const dashboard = useDictionary().dashboard;
  const copy = dashboard.requests;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/service-requests/mine');
  const requests = data?.requests ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h3 text-ink">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.intro}</p>
      </div>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : requests.length === 0 ? (
        <Card padding="md">
          <p className="text-ink-muted">
            {copy.emptyBefore}{' '}
            <LocaleLink href="/contact" className="font-semibold text-primary underline-offset-4 hover:underline">
              {copy.emptyCta}
            </LocaleLink>
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-line">
            {requests.map((request) => (
              <li key={request.ReferenceCode}>
                <LocaleLink href={`/dashboard/requests/${request.ReferenceCode}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-alt sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{request.Subtype || labels.service(request.ServiceCategory)}</p>
                    <p className="text-xs text-ink-muted">{dashboard.overview.requestMeta(request.ReferenceCode, format.date(request.createdAt))}</p>
                  </div>
                  <RequestStatusBadge status={request.Status} />
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={2} />
                </LocaleLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
