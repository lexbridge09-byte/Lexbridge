'use client';

import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deriveServiceHref } from '@/brand/navigation';
import { useDictionary } from '@/brand/localeContext';
import { LocaleLink } from '@/components/localeLink';
import { ServiceRequestForm } from '@/components/serviceRequestForm';
import { Button, Card, InlineAlert } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useCatalogLabels } from '@/lib/localeTools';

const MIN_CONCERN_LENGTH = 15;
const URGENCY_TONES = { urgent: 'error', 'time-sensitive': 'warning', routine: 'success' };

async function loadClassification(concern, dictionary) {
  try {
    const data = await requestApi('/solution-finder/classify', { method: 'POST', body: { Description: concern } });
    return { phase: 'result', ...data };
  } catch (error) {
    if (error.status === 400) {
      return { phase: 'describe', error: localizeFieldErrors(error, dictionary).Description ?? localizeApiError(error, dictionary) };
    }
    // Suggestion tool unavailable: still let the visitor send their concern to the team
    return { phase: 'result', classification: null, services: [], message: localizeApiError(error, dictionary) };
  }
}

export function SolutionFinder({ initialConcern = '' }) {
  const dictionary = useDictionary();
  const copy = dictionary.solutionFinder;
  const labels = useCatalogLabels();
  const shouldAutoRun = initialConcern.trim().length >= MIN_CONCERN_LENGTH;
  const [concern, setConcern] = useState(initialConcern);
  const [outcome, setOutcome] = useState(shouldAutoRun ? { phase: 'loading' } : { phase: 'describe' });

  useEffect(() => {
    if (!shouldAutoRun) return;
    let isCancelled = false;
    loadClassification(initialConcern, dictionary).then((nextOutcome) => {
      if (!isCancelled) setOutcome(nextOutcome);
    });
    return () => {
      isCancelled = true;
    };
  }, [initialConcern, shouldAutoRun, dictionary]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (concern.trim().length < MIN_CONCERN_LENGTH) {
      setOutcome({ phase: 'describe', error: copy.form.tooShort });
      return;
    }
    setOutcome({ phase: 'loading' });
    setOutcome(await loadClassification(concern, dictionary));
  }

  if (outcome.phase === 'describe' || outcome.phase === 'loading') {
    const isLoading = outcome.phase === 'loading';
    return (
      <Card padding="lg" className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit}>
          <label htmlFor="concern" className="text-h3 text-ink">
            {copy.form.label}
          </label>
          <textarea
            id="concern"
            name="concern"
            rows={6}
            maxLength={3000}
            value={concern}
            onChange={(event) => setConcern(event.target.value)}
            disabled={isLoading}
            aria-invalid={Boolean(outcome.error)}
            aria-describedby={outcome.error ? 'concern-error concern-privacy' : 'concern-privacy'}
            placeholder={copy.form.placeholder}
            className="mt-3 block w-full resize-y rounded-xl border border-line-strong bg-white p-4 text-base leading-7 text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:bg-surface-alt aria-[invalid=true]:border-danger"
          />
          {outcome.error && (
            <p id="concern-error" className="mt-2 text-sm font-medium text-danger">
              {outcome.error}
            </p>
          )}

          <div className="mt-4">
            <p className="text-sm font-semibold text-ink-muted">{copy.form.examplesLabel}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {copy.form.examples.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => setConcern(example)}
                    disabled={isLoading}
                    className="rounded-full bg-surface-alt px-3.5 py-2 text-left text-sm text-ink ring-1 ring-line hover:bg-primary-50 hover:ring-primary-100"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Button type="submit" size="lg" disabled={isLoading} className="mt-5 w-full sm:w-auto">
            {isLoading ? copy.form.busy : copy.form.submit}
          </Button>
          <p id="concern-privacy" className="mt-3 text-xs leading-5 text-ink-muted">
            {copy.form.privacyNote}
          </p>
          <p aria-live="polite" className="sr-only">
            {isLoading ? copy.form.busyForScreenReaders : ''}
          </p>
        </form>
      </Card>
    );
  }

  const { classification, services, message } = outcome;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
      <Card padding="lg">
        {classification ? (
          <>
            <h2 className="text-h3 text-ink">{copy.result.title}</h2>
            <p className="mt-3 text-base leading-7 text-ink">{classification.plainSummary}</p>

            {URGENCY_TONES[classification.urgency] && (
              <InlineAlert tone={URGENCY_TONES[classification.urgency]} title={copy.urgency[classification.urgency]} className="mt-5">
                <p>{classification.urgencyReason}</p>
                {classification.urgency === 'urgent' && <p className="mt-1 font-semibold">{copy.urgency.emergency}</p>}
              </InlineAlert>
            )}

            {services.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-ink-muted">{copy.result.servicesTitle}</h3>
                <ul className="mt-3 space-y-2">
                  {services.map((service) => (
                    <li key={service.key}>
                      <LocaleLink
                        href={deriveServiceHref(service.key)}
                        className="group flex items-center gap-3 rounded-xl border border-line p-4 hover:border-primary-100 hover:bg-primary-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-display font-semibold text-ink">{labels.service(service.key)}</span>
                          <span className="mt-0.5 block text-sm text-ink-muted">{labels.serviceSummary(service.key) || service.summary}</span>
                        </span>
                        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={2} />
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {classification.clarifyingQuestions.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-ink-muted">{copy.result.questionsTitle}</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-6 marker:text-primary">
                  {classification.clarifyingQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="text-h3 text-ink">{copy.result.fallbackTitle}</h2>
            <p className="mt-3 leading-7 text-ink-muted">{message}</p>
          </>
        )}

        <Button variant="link" onClick={() => setOutcome({ phase: 'describe' })} className="mt-5">
          {copy.result.edit}
        </Button>
        <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-ink-muted">{copy.result.disclaimer}</p>
      </Card>

      <Card padding="lg" className="lg:sticky lg:top-24">
        <h2 className="text-h3 text-ink">{copy.request.title}</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-ink-muted">{copy.request.description}</p>
        <ServiceRequestForm
          source="solution-finder"
          defaultCategory={classification?.primaryCategory ?? 'other'}
          initialDescription={concern}
          descriptionLabel={copy.request.descriptionLabel}
          submitLabel={copy.request.submitLabel}
        />
      </Card>
    </div>
  );
}
