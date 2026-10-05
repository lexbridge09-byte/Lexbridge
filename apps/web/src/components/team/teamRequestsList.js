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
  const { data, error, isLoading, reload } = useApiData('/team/requests');
  const requests = data?.requests ?? [];

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
              <li key={request.ReferenceCode}>
                <LocaleLink href={`/team/requests/${request.ReferenceCode}`} className="flex items-center gap-4 px-4 py-3 hover:bg-card-hover sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{request.Subtype || labels.service(request.ServiceCategory)}</p>
                    <p className="text-xs text-ink-muted">{copy.requestMeta(request.ReferenceCode, format.date(request.createdAt))}</p>
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
