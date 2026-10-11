'use client';

import { ChevronRight } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { RequestStatusBadge } from '@/components/statusBadge';
import { Card } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function TeamRequestsList() {
  const copy = useDictionary().team.requests;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/team/assignments');
  const requests = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h3 text-on-canvas">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-on-canvas-muted">{copy.intro}</p>
      </div>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : requests.length === 0 ? (
        <Card padding="md">
          <p className="text-ink-muted">{copy.empty}</p>
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-line">
            {requests.map((request) => (
              <li key={`${request.kind}-${request.referenceCode}`}>
                <LocaleLink href={request.href} className="flex items-center gap-4 px-4 py-3 hover:bg-card-hover sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{request.kind === 'service-request' ? request.title || labels.service(request.source?.ServiceCategory) : request.title}</p>
                    <p className="text-xs text-ink-muted">{copy.requestMeta(request.referenceCode, format.date(request.startsAt || request.createdAt))}</p>
                  </div>
                  <RequestStatusBadge status={request.status} />
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
