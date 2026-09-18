'use client';

import { useState } from 'react';
import { CANCELLATION_NOTICE_HOURS } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { ConsultationStatusBadge } from '@/components/statusBadge';
import { Button, ButtonLink, Card } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

const NOTICE_MS = CANCELLATION_NOTICE_HOURS * 60 * 60 * 1000;

function ConsultationItem({ consultation, nowMs, onChanged }) {
  const dictionary = useDictionary();
  const copy = dictionary.dashboard.consultations;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [message, setMessage] = useState(null);

  const startsAtMs = new Date(consultation.StartsAt).getTime();
  const isScheduled = consultation.Status === 'scheduled';
  const canCancel = isScheduled && startsAtMs - nowMs > NOTICE_MS;

  async function handleCancel() {
    setIsCancelling(true);
    setMessage(null);
    try {
      await requestApi(`/consultations/mine/${encodeURIComponent(consultation.ReferenceCode)}/cancel`, { method: 'POST' });
      onChanged();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
      setIsCancelling(false);
      setIsConfirming(false);
    }
  }

  return (
    <Card as="li" padding="md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display font-semibold text-ink">{labels.consultationType(consultation.ConsultationType)}</p>
        <ConsultationStatusBadge status={consultation.Status} />
      </div>
      <p className="mt-1 text-sm text-ink">
        {copy.when(
          format.day(consultation.StartsAt),
          format.time(consultation.StartsAt),
          consultation.DurationMinutes,
          labels.consultationMode(consultation.Mode),
        )}
      </p>
      <p className="text-xs text-ink-muted">{copy.reference(consultation.ReferenceCode)}</p>

      {consultation.Description && (
        <p className="mt-3 max-w-[65ch] whitespace-pre-line rounded-xl bg-surface-alt px-4 py-2.5 text-sm leading-6 text-ink">
          {consultation.Description}
        </p>
      )}

      {isScheduled && consultation.Mode === 'video' && (
        <div className="mt-3">
          {consultation.MeetingLink ? (
            <ButtonLink href={consultation.MeetingLink} isExternal size="sm">
              {copy.joinVideo}
            </ButtonLink>
          ) : (
            <p className="text-sm text-ink-muted">{copy.videoPending}</p>
          )}
        </div>
      )}

      {isScheduled && consultation.Mode === 'phone' && <p className="mt-3 text-sm text-ink-muted">{copy.phoneNote}</p>}

      {message && (
        <div className="mt-3">
          <FormMessage message={message} />
        </div>
      )}

      {canCancel && !isConfirming && (
        <Button variant="link" onClick={() => setIsConfirming(true)} className="mt-3 text-sm text-danger">
          {copy.cancel}
        </Button>
      )}

      {canCancel && isConfirming && (
        <div role="group" aria-label={copy.confirmLabel} className="mt-3 rounded-xl border border-danger/25 bg-danger-50 p-3">
          <p className="text-sm text-ink">{copy.confirmBody}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button variant="danger" size="sm" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? copy.confirmBusy : copy.confirmYes}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsConfirming(false)} disabled={isCancelling}>
              {copy.confirmNo}
            </Button>
          </div>
        </div>
      )}

      {isScheduled && !canCancel && startsAtMs > nowMs && (
        <p className="mt-3 text-sm text-ink-muted">
          {copy.tooLateBefore(CANCELLATION_NOTICE_HOURS)}
          <LocaleLink href="/contact" className="font-semibold text-primary underline underline-offset-4">
            {copy.tooLateLink}
          </LocaleLink>
          {copy.tooLateAfter}
        </p>
      )}
    </Card>
  );
}

export function ConsultationsList() {
  const copy = useDictionary().dashboard.consultations;
  const [nowMs] = useState(() => Date.now());
  const { data, error, isLoading, reload } = useApiData('/consultations/mine');
  const consultations = data?.consultations ?? [];

  const upcoming = consultations
    .filter((consultation) => consultation.Status === 'scheduled' && new Date(consultation.StartsAt).getTime() > nowMs)
    .sort((a, b) => new Date(a.StartsAt) - new Date(b.StartsAt));
  const past = consultations
    .filter((consultation) => !upcoming.includes(consultation))
    .sort((a, b) => new Date(b.StartsAt) - new Date(a.StartsAt));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h3 text-ink">{copy.title}</h1>
        <ButtonLink href="/consultation" size="sm">
          {copy.book}
        </ButtonLink>
      </div>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="text-h4 text-ink">
              {copy.upcoming}
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-1 text-sm text-ink-muted">{copy.noUpcoming}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {upcoming.map((consultation) => (
                  <ConsultationItem key={consultation.ReferenceCode} consultation={consultation} nowMs={nowMs} onChanged={reload} />
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-h4 text-ink [&::-webkit-details-marker]:hidden">
                {copy.past} ({past.length})
              </summary>
              <ul className="mt-3 space-y-3">
                {past.map((consultation) => (
                  <ConsultationItem key={consultation.ReferenceCode} consultation={consultation} nowMs={nowMs} onChanged={reload} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
