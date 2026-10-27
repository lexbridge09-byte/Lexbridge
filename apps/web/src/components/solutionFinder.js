'use client';

import { ArrowUp, Check, ChevronRight, Lock, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { deriveServiceHref } from '@/brand/navigation';
import { useFeatures } from '@/components/featuresProvider';
import { useDictionary } from '@/brand/localeContext';
import { LocaleLink } from '@/components/localeLink';
import { ServiceRequestForm } from '@/components/serviceRequestForm';
import { Button, FormSheet, InlineAlert } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useCatalogLabels } from '@/lib/localeTools';

const MIN_CONCERN_LENGTH = 15;
// Keep the step animation on screen long enough to read, even when the answer is instant
const MIN_LOADING_MS = 1800;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
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

export function SolutionFinder({ initialConcern = '', aside = null }) {
  const dictionary = useDictionary();
  const features = useFeatures();
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
    if (outcome.phase === 'loading') return;
    if (concern.trim().length < MIN_CONCERN_LENGTH) {
      setOutcome({ phase: 'describe', error: copy.form.tooShort });
      return;
    }
    setOutcome({ phase: 'loading' });
    const [nextOutcome] = await Promise.all([loadClassification(concern, dictionary), wait(MIN_LOADING_MS)]);
    setOutcome(nextOutcome);
  }

  if (outcome.phase === 'describe' || outcome.phase === 'loading') {
    const isLoading = outcome.phase === 'loading';
    const detailProgress = Math.min(1, concern.trim().length / MIN_CONCERN_LENGTH);
    const hasEnoughDetail = detailProgress >= 1;

    return (
      <div className={aside ? 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10' : ''}>
      <div className={aside ? 'min-w-0' : 'mx-auto max-w-3xl'}>
        <form onSubmit={handleSubmit} aria-busy={isLoading}>
          {/* Composer: dark, focused writing surface with the send action inside it */}
          <div
            className={`relative overflow-hidden rounded-panel border bg-canvas-alt shadow-float transition-[border-color,box-shadow] duration-(--dur-200) focus-within:border-primary focus-within:shadow-glow ${outcome.error ? 'border-danger' : 'border-line-canvas hover:border-primary/40'}`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line-canvas px-5 py-3">
              <label htmlFor="concern" className="flex items-center gap-2 text-sm font-semibold text-on-canvas">
                <Sparkles aria-hidden="true" className="size-4 text-primary-bright" strokeWidth={2} />
                {copy.form.label}
              </label>
              <span className="text-xs font-medium text-on-canvas-subtle">{copy.form.eyebrow}</span>
            </div>

            <textarea
              id="concern"
              name="concern"
              rows={5}
              maxLength={3000}
              value={concern}
              onChange={(event) => setConcern(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) event.currentTarget.form.requestSubmit();
              }}
              disabled={isLoading}
              aria-invalid={Boolean(outcome.error)}
              aria-describedby={outcome.error ? 'concern-error concern-privacy' : 'concern-privacy'}
              placeholder={copy.form.placeholder}
              className="block max-h-[50vh] min-h-40 w-full resize-none bg-transparent px-5 py-4 text-base leading-7 text-on-canvas [field-sizing:content] placeholder:text-on-canvas-subtle focus:outline-none disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4">
              {/* Detail meter: fills toward the minimum a useful suggestion needs */}
              <div className="flex min-w-0 items-center gap-3" aria-live="polite">
                <span aria-hidden="true" className="relative h-1.5 w-24 overflow-hidden rounded-full bg-canvas-raised">
                  <span
                    className={`absolute inset-y-0 left-0 w-full origin-left rounded-full transition-[transform,background-color] duration-(--dur-300) ease-(--ease-out-soft) ${hasEnoughDetail ? 'bg-success' : 'bg-primary'}`}
                    style={{ transform: `scaleX(${detailProgress})` }}
                  />
                </span>
                <span className={`flex items-center gap-1 text-xs font-medium ${hasEnoughDetail ? 'text-success' : 'text-on-canvas-subtle'}`}>
                  {hasEnoughDetail && <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}
                  {concern.trim() ? (hasEnoughDetail ? copy.form.enoughDetail : copy.form.moreDetail) : copy.form.shortcut}
                </span>
              </div>
              <Button isLoading={isLoading} type="submit" disabled={isLoading} className="group/send">
                {copy.form.submit}
                <ArrowUp aria-hidden="true" className="size-4 transition-transform duration-(--dur-200) ease-(--ease-out-soft) group-hover/send:-translate-y-0.5 motion-reduce:transition-none" strokeWidth={2.25} />
              </Button>
            </div>

            {/* Loading: the steps the assistant works through, ticking one after another */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-canvas-alt/95 backdrop-blur-sm"
                >
                  <ol className="space-y-3">
                    {copy.form.loadingSteps.map((step, stepIndex) => (
                      <motion.li
                        key={step}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: stepIndex * 0.6, duration: 0.35 }}
                        className="flex items-center gap-3 text-sm font-medium text-on-canvas"
                      >
                        <motion.span
                          initial={{ backgroundColor: 'rgba(200, 143, 108, 0.15)' }}
                          animate={{ backgroundColor: 'rgba(29, 122, 70, 1)' }}
                          transition={{ delay: stepIndex * 0.6 + 0.5, duration: 0.25 }}
                          className="flex size-6 items-center justify-center rounded-full text-white"
                        >
                          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                        </motion.span>
                        {step}
                      </motion.li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {outcome.error && (
            <p id="concern-error" className="mt-2 text-sm font-medium text-danger">
              {outcome.error}
            </p>
          )}

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-canvas-subtle">{copy.form.examplesLabel}</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {copy.form.examples.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => {
                      setConcern(example);
                      document.getElementById('concern')?.focus();
                    }}
                    disabled={isLoading}
                    className="rounded-full border border-line-canvas bg-canvas-alt px-3.5 py-2 text-left text-sm text-on-canvas-muted transition-[border-color,color,transform] duration-(--dur-150) hover:border-primary/50 hover:text-on-canvas active:scale-(--press-scale) disabled:opacity-50"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p id="concern-privacy" className="mt-4 flex items-center gap-2 text-xs leading-5 text-on-canvas-subtle">
            <Lock aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2} />
            {copy.form.privacyNote}
          </p>
          <p aria-live="polite" className="sr-only">
            {isLoading ? copy.form.busyForScreenReaders : ''}
          </p>
        </form>

        <div className="mt-10 border-t border-line-canvas pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-canvas-subtle">{copy.form.nextTitle}</p>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {copy.form.nextSteps.map((step, stepIndex) => (
              <li key={step} className="flex items-start gap-3">
                <span className="tabular font-brand text-2xl font-bold leading-none text-primary-bright">{String(stepIndex + 1).padStart(2, '0')}</span>
                <span className="text-sm leading-6 text-on-canvas-muted">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {aside}
      </div>
    );
  }

  const { classification, services } = outcome;

  // One request form, description already filled in and editable in place (no separate "edit" step)
  const requestSheet = (
    <FormSheet
      title={classification ? copy.request.title : copy.result.fallbackTitle}
      note={classification ? copy.request.description : copy.result.fallbackNote}
    >
      <ServiceRequestForm
        source="solution-finder"
        defaultCategory={classification?.primaryCategory ?? 'other'}
        initialDescription={concern}
        descriptionLabel={copy.request.descriptionLabel}
        submitLabel={copy.request.submitLabel}
      />
    </FormSheet>
  );

  // No suggestion available: skip the error card entirely and go straight to sending it to the team
  if (!classification) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={aside ? 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10' : 'mx-auto max-w-2xl'}
      >
        <div className="min-w-0">{requestSheet}</div>
        {aside}
      </motion.div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="relative overflow-hidden rounded-panel border border-primary/25 bg-hero p-6 sm:p-8"
      >
        <h2 className="font-heading text-3xl font-bold text-on-canvas">{copy.result.title}</h2>
            <p className="mt-3 text-base leading-7 text-on-canvas-muted">{classification.plainSummary}</p>

            {URGENCY_TONES[classification.urgency] && (
              <InlineAlert tone={URGENCY_TONES[classification.urgency]} title={copy.urgency[classification.urgency]} className="mt-5">
                <p>{classification.urgencyReason}</p>
                {classification.urgency === 'urgent' && <p className="mt-1 font-semibold">{copy.urgency.emergency}</p>}
              </InlineAlert>
            )}

            {services.length > 0 && (
              <>
                <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-on-canvas-subtle">{copy.result.servicesTitle}</h3>
                <ul className="mt-3 space-y-2">
                  {services.map((service) => (
                    <li key={service.key}>
                      <LocaleLink
                        href={deriveServiceHref(service.key, features ?? {})}
                        className="group flex items-center gap-3 rounded-card border border-line-canvas bg-canvas-alt p-4 transition-[border-color,transform] duration-(--dur-200) hover:-translate-y-0.5 hover:border-primary/50 motion-reduce:hover:translate-y-0"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-display font-semibold text-on-canvas">{labels.service(service.key)}</span>
                          <span className="mt-0.5 block text-sm text-on-canvas-muted">{labels.serviceSummary(service.key) || service.summary}</span>
                        </span>
                        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-primary-bright transition-transform duration-(--dur-150) group-hover:translate-x-1" strokeWidth={2} />
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {classification.clarifyingQuestions.length > 0 && (
              <>
                <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-on-canvas-subtle">{copy.result.questionsTitle}</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-6 text-on-canvas-muted marker:text-primary">
                  {classification.clarifyingQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </>
            )}
        <p className="mt-5 border-t border-line-canvas pt-4 text-xs leading-5 text-on-canvas-subtle">{copy.result.disclaimer}</p>
      </motion.div>

      <div className="lg:sticky lg:top-24">{requestSheet}</div>
    </div>
  );
}
