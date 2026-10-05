'use client';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { RequestStatusBadge } from '@/components/statusBadge';
import { Button, Card } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

// Guests submit requests without an account; the reference code from their confirmation
// screen links the request to this dashboard once they sign in with the same email.
function TrackRequestPanel({ onLinked }) {
  const dictionary = useDictionary();
  const copy = dictionary.dashboard.requests;
  const [referenceCode, setReferenceCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const code = referenceCode.trim();
    if (!code) return;
    setIsLinking(true);
    setMessage(null);
    try {
      await requestApi('/service-requests/link', { method: 'POST', body: { ReferenceCode: code } });
      setMessage({ tone: 'success', text: copy.trackLinked });
      setReferenceCode('');
      onLinked();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <Card as="form" padding="md" onSubmit={handleSubmit} className="border-primary-100/60">
      <h2 className="text-h4 text-ink">{copy.trackTitle}</h2>
      <p className="mt-1 text-sm leading-6 text-ink-muted">{copy.trackIntro}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={referenceCode}
          onChange={(event) => setReferenceCode(event.target.value)}
          placeholder={copy.trackPlaceholder}
          aria-label={copy.trackTitle}
          maxLength={40}
          className="control sm:max-w-xs"
        />
        <Button type="submit" size="md" isLoading={isLinking} className="sm:w-40">
          {copy.trackAction}
        </Button>
      </div>
      {message && <div className="mt-3"><FormMessage message={message} /></div>}
    </Card>
  );
}

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
        <h1 className="text-h3 text-on-canvas">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-on-canvas-muted">{copy.intro}</p>
      </div>

      <TrackRequestPanel onLinked={reload} />

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
                <LocaleLink href={`/dashboard/requests/${request.ReferenceCode}`} className="flex items-center gap-4 px-4 py-3 hover:bg-card-hover sm:px-5">
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
