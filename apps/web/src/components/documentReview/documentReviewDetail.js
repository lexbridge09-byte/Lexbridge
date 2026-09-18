'use client';

import { Check, ChevronLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { DocumentReviewReport } from '@/components/documentReview/documentReviewReport';
import { CheckboxField, TextAreaField, TextField } from '@/components/formFields';
import { LanguageSelectField } from '@/components/languageSelectField';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { DocumentReviewStatusBadge, RiskBadge } from '@/components/statusBadge';
import { Button, ButtonLink, Card, InlineAlert } from '@/components/ui';
import { WhatsAppOptInField } from '@/components/whatsAppOptInField';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

const POLL_INTERVAL_MS = 3000;
const PENDING_STATUSES = ['queued', 'processing'];
// Seconds after upload at which each later stage is shown; the worker usually finishes in about a minute
const STAGE_START_SECONDS = [0, 4, 20, 40];

/*
  E1: staged progress while the review runs. Stages advance with elapsed time (the worker reports no finer
  progress), and the last stage holds until the report arrives, so nothing ever claims to be done early.
*/
function ReviewProgress({ review, now, copy }) {
  const elapsedSeconds = review.Status === 'queued' ? 0 : Math.max(0, (now - new Date(review.createdAt).getTime()) / 1000);
  const activeStage = STAGE_START_SECONDS.findLastIndex((startSeconds) => elapsedSeconds >= startSeconds);

  return (
    <Card padding="md" role="status" aria-live="polite">
      <p className="font-semibold text-ink">{copy.processingTitle}</p>
      <p className="text-sm text-ink-muted">{copy.processingBody}</p>
      <ol className="mt-4 space-y-3">
        {copy.stages.map((stage, stageIndex) => {
          const isDone = stageIndex < activeStage;
          const isActive = stageIndex === activeStage;
          return (
            <li key={stage} className={`flex items-center gap-3 text-sm ${isDone || isActive ? 'text-ink' : 'text-ink-subtle'}`}>
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-(--dur-300) ${isDone ? 'bg-success text-white' : isActive ? 'bg-primary-50 text-primary' : 'bg-surface-alt'}`}
              >
                {isDone ? (
                  <Check aria-hidden="true" className="size-3.5 motion-safe:animate-fade-in" strokeWidth={3} />
                ) : isActive ? (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" strokeWidth={2.5} />
                ) : null}
              </span>
              <span className={isActive ? 'font-semibold' : ''}>{stage}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function LawyerReviewPanel({ review, onRequested }) {
  const dictionary = useDictionary();
  const copy = dictionary.documentReview.lawyer;
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  if (review.ServiceRequestReference) {
    return (
      <InlineAlert tone="success" title={copy.title}>
        <p>{copy.requested(review.ServiceRequestReference)}</p>
        <ButtonLink href={`/dashboard/requests/${review.ServiceRequestReference}`} variant="link" className="mt-1">
          {copy.viewRequest}
        </ButtonLink>
      </InlineAlert>
    );
  }
  if (review.FileDeletedAt) return <InlineAlert tone="info">{copy.unavailable}</InlineAlert>;

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (formData.get('ConsentGiven') !== 'on') {
      setFieldErrors({ ConsentGiven: copy.consentRequired });
      return;
    }
    setIsBusy(true);
    setFieldErrors({});
    setFormError('');
    try {
      await requestApi(`/document-reviews/mine/${encodeURIComponent(review.ReferenceCode)}/lawyer-review`, {
        method: 'POST',
        body: {
          FullName: String(formData.get('FullName') ?? '').trim() || undefined,
          Phone: String(formData.get('Phone') ?? '').trim(),
          Notes: String(formData.get('Notes') ?? '').trim() || undefined,
          PreferredLanguage: formData.get('PreferredLanguage'),
          WhatsAppOptIn: formData.get('WhatsAppOptIn') === 'on',
          ConsentGiven: true,
        },
      });
      onRequested();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setFieldErrors(localizeFieldErrors(error, dictionary));
      setFormError(error.status === 409 ? copy.unavailable : localizeApiError(error, dictionary));
      setIsBusy(false);
    }
  }

  return (
    <Card as="section" padding="md" aria-labelledby="lawyer-review-title" className="border-primary-100 bg-primary-50/40">
      <h2 id="lawyer-review-title" className="text-h4 text-ink">
        {copy.title}
      </h2>
      <p className="mt-0.5 text-sm text-ink-muted">{copy.body}</p>
      {!isOpen ? (
        <Button onClick={() => setIsOpen(true)} className="mt-3">
          {copy.open}
        </Button>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="lawyer-name" label={copy.fullName} name="FullName" autoComplete="name" error={fieldErrors.FullName} />
            <TextField
              id="lawyer-phone"
              label={copy.phone}
              name="Phone"
              type="tel"
              autoComplete="tel"
              placeholder={copy.phonePlaceholder}
              required
              error={fieldErrors.Phone}
            />
          </div>
          <LanguageSelectField id="lawyer-language" label={copy.languageLabel} />
          <TextAreaField id="lawyer-notes" label={copy.notes} name="Notes" rows={3} maxLength={2000} hint={copy.notesHint} error={fieldErrors.Notes} />
          <CheckboxField id="lawyer-consent" name="ConsentGiven" error={fieldErrors.ConsentGiven}>
            {copy.consentBefore}
            <LocaleLink href="/legal/privacy" className="font-semibold text-primary underline underline-offset-4">
              {copy.consentLink}
            </LocaleLink>
            {copy.consentAfter}
          </CheckboxField>
          {isFeatureEnabled('whatsAppNotifications') && <WhatsAppOptInField />}
          {formError && Object.keys(fieldErrors).length === 0 && <InlineAlert tone="error">{formError}</InlineAlert>}
          <Button type="submit" disabled={isBusy}>
            {isBusy ? copy.busy : copy.submit}
          </Button>
        </form>
      )}
    </Card>
  );
}

export function DocumentReviewDetail({ referenceCode }) {
  const copy = useDictionary().documentReview.report;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData(`/document-reviews/mine/${encodeURIComponent(referenceCode)}`);
  const review = data?.review;
  const isPending = PENDING_STATUSES.includes(review?.Status);
  const [now, setNow] = useState(() => Date.now());

  // Poll until the worker finishes; the interval stops as soon as the status settles
  useEffect(() => {
    if (!isPending) return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
      reload();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPending, reload]);

  if (isLoading && !data) return <LoadingNote />;
  if (error?.status === 404) {
    return (
      <Card padding="md">
        <h1 className="text-h3 text-ink">{copy.notFoundTitle}</h1>
        <p className="mt-1 text-ink-muted">{copy.notFoundBody}</p>
        <ButtonLink href="/dashboard/document-reviews" variant="secondary" size="sm" className="mt-4">
          {copy.back}
        </ButtonLink>
      </Card>
    );
  }
  if (error && !review) return <ErrorNote error={error} onRetry={reload} />;
  if (!review) return null;

  return (
    <div className="space-y-5">
      <div>
        <LocaleLink href="/dashboard/document-reviews" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {copy.breadcrumb}
        </LocaleLink>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="break-all text-h3 text-ink">{review.OriginalName}</h1>
          {review.Status === 'completed' ? <RiskBadge level={review.RiskLevel} /> : <DocumentReviewStatusBadge status={review.Status} />}
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.meta(review.ReferenceCode, format.dateTime(review.createdAt))}</p>
      </div>

      {isPending && <ReviewProgress review={review} now={now} copy={copy} />}

      {review.Status === 'failed' && (
        <InlineAlert tone="warning" title={copy.failedTitle}>
          {review.FailureReason === 'declined' ? copy.declined : copy.error}
        </InlineAlert>
      )}

      {review.Status === 'completed' && (
        <>
          <DocumentReviewReport report={review.Report} />
          {review.FileDeletedAt && <p className="text-xs text-ink-muted">{copy.fileDeleted}</p>}
          <LawyerReviewPanel key={review.ServiceRequestReference || 'open'} review={review} onRequested={reload} />
        </>
      )}
    </div>
  );
}
