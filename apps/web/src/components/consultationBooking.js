'use client';

import { ArrowLeft, Check, CircleCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONSULTATION_MODES, CONSULTATION_TYPES } from '@lexbridge/shared';
import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary, useLocale } from '@/brand/localeContext';
import { CheckboxField, FieldError, TextAreaField, TextField } from '@/components/formFields';
import { LocaleLink } from '@/components/localeLink';
import { Button, ButtonLink, Card, InlineAlert, SkeletonList, StepIndicator } from '@/components/ui';
import { WhatsAppOptInField } from '@/components/whatsAppOptInField';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { formatDateKey } from '@/lib/formatValues';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { deriveLoginHref } from '@/lib/safeRedirect';

const FORM_ID = 'consultation-form';
const DRAFT_STORAGE_KEY = 'lexbridge.consultationDraft';
const EMPTY_DRAFT = { ConsultationType: '', Mode: '', SlotId: '', Phone: '', Description: '', WhatsAppOptIn: false };
const CHOICE_STEP = 1;
const TIME_STEP = 2;
const DETAILS_STEP = 3;

function readDraft() {
  try {
    return JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function saveDraft(draft) {
  try {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage can be unavailable in private browsing; the visitor just re-selects after signing in
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Nothing to clear
  }
}

function groupSlotsByDate(slots) {
  const groups = new Map();
  for (const slot of slots) {
    const dateKey = formatDateKey(slot.StartsAt);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey).push(slot);
  }
  return [...groups].map(([dateKey, daySlots]) => ({ dateKey, daySlots }));
}

const CHOICE_CARD_CLASS =
  'flex h-full cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-3.5 transition-colors duration-(--dur-150) hover:border-line-strong has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:ring-2 has-[:checked]:ring-primary-100 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';

const CHIP_CLASS =
  'shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-(--dur-150) has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';

function SummaryRow({ label, value, isMissing }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`text-right ${isMissing ? 'text-ink-muted' : 'font-semibold text-ink'}`}>{value}</dd>
    </div>
  );
}

/*
  Three short steps (consultation, date and time, details) so each screen fits without scrolling.
  All steps stay mounted: choices survive Back, and the desktop summary follows along.
*/
export function ConsultationBooking() {
  const dictionary = useDictionary();
  const copy = dictionary.consultation;
  const stepCopy = dictionary.forms.serviceRequest;
  const summaryCopy = dictionary.ux.bookingSummary;
  const stepNames = dictionary.ux.steps.booking;
  const locale = useLocale();
  const labels = useCatalogLabels();
  const format = useFormatters();
  const stepStatusRef = useRef(null);
  const [session, setSession] = useState({ isChecked: false, user: null });
  const [slotsState, setSlotsState] = useState({ isLoaded: false, slots: [], error: '' });
  const [slotsReloadCount, setSlotsReloadCount] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [step, setStep] = useState(CHOICE_STEP);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState(null);

  // Session check, then restore choices saved before the visitor went to sign in and resume where they left off
  useEffect(() => {
    let isCancelled = false;
    requestApi('/auth/me')
      .then((data) => data.user)
      .catch(() => null)
      .then((user) => {
        if (isCancelled) return;
        const savedDraft = readDraft();
        setSession({ isChecked: true, user });
        setDraft((current) => {
          const restored = savedDraft ? { ...current, ...savedDraft } : current;
          return { ...restored, Phone: restored.Phone || user?.Phone || '' };
        });
        if (savedDraft?.ConsultationType && savedDraft?.Mode) setStep(savedDraft.SlotId ? DETAILS_STEP : TIME_STEP);
        if (savedDraft && user) clearDraft();
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    requestApi('/consultations/slots')
      .then((data) => {
        if (!isCancelled) setSlotsState({ isLoaded: true, slots: data.slots ?? [], error: '' });
      })
      .catch((error) => {
        if (!isCancelled) setSlotsState({ isLoaded: true, slots: [], error: localizeApiError(error, dictionary) });
      });
    return () => {
      isCancelled = true;
    };
  }, [slotsReloadCount, dictionary]);

  const slotGroups = useMemo(() => groupSlotsByDate(slotsState.slots), [slotsState.slots]);
  const selectedSlot = slotsState.slots.find((slot) => slot._id === draft.SlotId) ?? null;
  const activeDateKey = selectedDateKey || (selectedSlot ? formatDateKey(selectedSlot.StartsAt) : slotGroups[0]?.dateKey ?? '');
  const activeGroup = slotGroups.find((group) => group.dateKey === activeDateKey) ?? slotGroups[0];
  const hasChoice = Boolean(draft.ConsultationType && draft.Mode);
  const hasSelections = Boolean(hasChoice && selectedSlot);
  // Never show a step whose earlier choices are missing, e.g. a restored time that has since been booked
  const activeStep = !hasChoice ? CHOICE_STEP : step === DETAILS_STEP && slotsState.isLoaded && !selectedSlot ? TIME_STEP : step;

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  }

  function goToStep(nextStep) {
    setStep(nextStep);
    setFormError('');
    requestAnimationFrame(() => stepStatusRef.current?.focus());
  }

  function validateStep() {
    if (activeStep === CHOICE_STEP) {
      return {
        ...(!draft.ConsultationType && { ConsultationType: copy.validation.type }),
        ...(!draft.Mode && { Mode: copy.validation.mode }),
      };
    }
    if (activeStep === TIME_STEP && !selectedSlot) return { SlotId: copy.validation.slot };
    return {};
  }

  function goToSignIn() {
    saveDraft(draft);
    window.location.assign(deriveLoginHref('/consultation', locale));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (activeStep !== DETAILS_STEP) {
      const errors = validateStep();
      setFieldErrors(errors);
      if (Object.keys(errors).length === 0) goToStep(activeStep + 1);
      return;
    }
    if (!hasSelections) return;
    if (!session.user) {
      goToSignIn();
      return;
    }
    if (!hasConsented) {
      setFieldErrors({ ConsentGiven: copy.validation.consent });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const data = await requestApi('/consultations', {
        method: 'POST',
        body: {
          SlotId: draft.SlotId,
          ConsultationType: draft.ConsultationType,
          Mode: draft.Mode,
          Phone: draft.Phone.trim(),
          Description: draft.Description.trim(),
          PreferredLanguage: locale,
          ConsentGiven: hasConsented,
          WhatsAppOptIn: draft.WhatsAppOptIn,
        },
      });
      clearDraft();
      setBooking(data.consultation);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error.status === 401) {
        goToSignIn();
        return;
      }
      if (error.status === 409) {
        updateDraft('SlotId', '');
        setSlotsReloadCount((count) => count + 1);
        goToStep(TIME_STEP);
        setFormError(copy.slots.taken);
      } else {
        setFieldErrors(localizeFieldErrors(error, dictionary));
        setFormError(localizeApiError(error, dictionary));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepIndicator = (
    <StepIndicator label={dictionary.ux.steps.label} steps={stepNames} current={booking ? stepNames.length + 1 : activeStep} className="mb-4" />
  );
  const whenLabel = selectedSlot ? copy.success.whenValue(format.shortDay(selectedSlot.StartsAt), format.time(selectedSlot.StartsAt)) : '';

  if (booking) {
    return (
      <div>
        {stepIndicator}
        <Card padding="lg" role="status" className="max-w-3xl">
          <span className="success-mark flex size-12 items-center justify-center rounded-full bg-success-50 text-success">
            <CircleCheck aria-hidden="true" className="size-7" strokeWidth={2} />
          </span>
          <h2 className="mt-4 text-h3 text-ink">{copy.success.title}</h2>
          <dl className="mt-5 grid gap-4 rounded-xl bg-success-50 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-ink-muted">{copy.success.referenceLabel}</dt>
              <dd className="mt-0.5 font-semibold tracking-wide text-ink">{booking.ReferenceCode}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">{copy.success.consultationLabel}</dt>
              <dd className="mt-0.5 text-ink">{labels.consultationType(booking.ConsultationType)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">{copy.success.whenLabel}</dt>
              <dd className="mt-0.5 text-ink">{copy.success.whenValue(format.day(booking.StartsAt), format.time(booking.StartsAt))}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">{copy.success.modeLabel}</dt>
              <dd className="mt-0.5 text-ink">{labels.consultationMode(booking.Mode)}</dd>
            </div>
          </dl>
          <h3 className="mt-6 text-h4 text-ink">{copy.success.nextTitle}</h3>
          <p className="mt-1 leading-7 text-ink-muted">
            {booking.Mode === 'video' ? copy.success.nextVideo : copy.success.nextPhone(draft.Phone)} {copy.success.nextDocuments}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/dashboard/consultations">{copy.success.viewCta}</ButtonLink>
            {isFeatureEnabled('documentUploads') && (
              <ButtonLink href="/dashboard/documents" variant="link">
                {copy.success.uploadCta}
              </ButtonLink>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {stepIndicator}
      <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
        <Card padding="lg">
          <p ref={stepStatusRef} tabIndex={-1} aria-live="polite" className="sr-only">
            {stepCopy.stepStatus(activeStep, stepNames.length, stepNames[activeStep - 1])}
          </p>
          <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
            <div hidden={activeStep !== CHOICE_STEP} className="space-y-6 motion-safe:animate-fade-in">
              <fieldset>
                <legend className="text-h4 text-ink">{copy.sections.type}</legend>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {CONSULTATION_TYPES.map((type) => (
                    <label key={type.key} className={CHOICE_CARD_CLASS}>
                      <input
                        type="radio"
                        name="ConsultationType"
                        value={type.key}
                        checked={draft.ConsultationType === type.key}
                        onChange={() => updateDraft('ConsultationType', type.key)}
                        className="radio mt-0.5"
                      />
                      <span>
                        <span className="block font-semibold text-ink">{labels.consultationType(type.key)}</span>
                        <span className="mt-0.5 block text-sm leading-5 text-ink-muted">{labels.consultationTypeSummary(type.key)}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <FieldError id="ConsultationType-error" message={fieldErrors.ConsultationType} />
              </fieldset>

              <fieldset>
                <legend className="text-h4 text-ink">{copy.sections.mode}</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {CONSULTATION_MODES.map((mode) => (
                    <label key={mode.key} className={CHOICE_CARD_CLASS}>
                      <input
                        type="radio"
                        name="Mode"
                        value={mode.key}
                        checked={draft.Mode === mode.key}
                        onChange={() => updateDraft('Mode', mode.key)}
                        className="radio mt-0.5"
                      />
                      <span>
                        <span className="block font-semibold text-ink">{labels.consultationMode(mode.key)}</span>
                        <span className="mt-0.5 block text-sm leading-5 text-ink-muted">{labels.consultationModeSummary(mode.key)}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <FieldError id="Mode-error" message={fieldErrors.Mode} />
              </fieldset>
            </div>

            <fieldset hidden={activeStep !== TIME_STEP} className="motion-safe:animate-fade-in">
              <legend className="text-h4 text-ink">{copy.sections.slot}</legend>
              <p className="mt-1 text-sm text-ink-muted">{copy.timeZoneNote}</p>

              {!slotsState.isLoaded ? (
                <div className="mt-3">
                  <SkeletonList label={copy.slots.loading} rows={2} />
                </div>
              ) : slotsState.error ? (
                <InlineAlert tone="error" className="mt-3">
                  <p>{slotsState.error}</p>
                  <Button variant="link" onClick={() => setSlotsReloadCount((count) => count + 1)} className="mt-1">
                    {copy.slots.retry}
                  </Button>
                </InlineAlert>
              ) : slotGroups.length === 0 ? (
                <InlineAlert tone="info" className="mt-3">
                  {copy.slots.emptyBefore}{' '}
                  <LocaleLink href="/contact?service=legal-consultation" className="font-semibold text-primary underline underline-offset-4">
                    {copy.slots.emptyLink}
                  </LocaleLink>{' '}
                  {copy.slots.emptyAfter}
                </InlineAlert>
              ) : (
                <>
                  <div role="group" aria-label={copy.slots.datesLabel} className="scroll-row mt-3 flex gap-2 pb-2">
                    {slotGroups.map((group) => {
                      const isActive = group.dateKey === activeGroup?.dateKey;
                      return (
                        <button
                          key={group.dateKey}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setSelectedDateKey(group.dateKey)}
                          className={`${CHIP_CLASS} ${isActive ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink hover:border-line-strong'}`}
                        >
                          {format.shortDay(group.daySlots[0].StartsAt)}
                        </button>
                      );
                    })}
                  </div>
                  {activeGroup && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-ink">{format.day(activeGroup.daySlots[0].StartsAt)}</p>
                      <div role="radiogroup" aria-label={copy.slots.timesLabel} className="mt-2 flex flex-wrap gap-2">
                        {activeGroup.daySlots.map((slot) => (
                          <label
                            key={slot._id}
                            className={`${CHIP_CLASS} tabular cursor-pointer border-line bg-white text-ink hover:border-line-strong has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:text-primary-dark`}
                          >
                            <input
                              type="radio"
                              name="SlotId"
                              value={slot._id}
                              checked={draft.SlotId === slot._id}
                              onChange={() => updateDraft('SlotId', slot._id)}
                              className="sr-only"
                            />
                            {format.time(slot.StartsAt)}
                            <span className="sr-only">{copy.slots.durationForScreenReaders(slot.DurationMinutes)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <FieldError id="SlotId-error" message={fieldErrors.SlotId} />
            </fieldset>

            <fieldset hidden={activeStep !== DETAILS_STEP} className="space-y-4 motion-safe:animate-fade-in">
              <legend className="text-h4 text-ink">{copy.sections.details}</legend>
              {hasSelections && (
                <p className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-sm text-ink lg:hidden">
                  {copy.summary(labels.consultationType(draft.ConsultationType), labels.consultationMode(draft.Mode), format.shortDay(selectedSlot.StartsAt), format.time(selectedSlot.StartsAt))}
                </p>
              )}
              <TextField
                label={copy.fields.phoneLabel}
                name="Phone"
                type="tel"
                autoComplete="tel"
                placeholder={copy.fields.phonePlaceholder}
                value={draft.Phone}
                onChange={(event) => updateDraft('Phone', event.target.value)}
                hint={copy.fields.phoneHint}
                error={fieldErrors.Phone}
                className="max-w-md"
              />
              <TextAreaField
                label={copy.fields.descriptionLabel}
                name="Description"
                rows={3}
                maxLength={5000}
                value={draft.Description}
                onChange={(event) => updateDraft('Description', event.target.value)}
                hint={copy.fields.descriptionHint}
                error={fieldErrors.Description}
              />

              {session.user && (
                <CheckboxField
                  name="ConsentGiven"
                  checked={hasConsented}
                  onChange={(event) => setHasConsented(event.target.checked)}
                  error={fieldErrors.ConsentGiven}
                >
                  {copy.consent.before}
                  <LocaleLink href="/legal/privacy" className="font-semibold text-primary underline underline-offset-4">
                    {copy.consent.link}
                  </LocaleLink>
                  {copy.consent.after}
                </CheckboxField>
              )}

              {isFeatureEnabled('whatsAppNotifications') && (
                <WhatsAppOptInField checked={draft.WhatsAppOptIn} onChange={(isChecked) => updateDraft('WhatsAppOptIn', isChecked)} />
              )}
            </fieldset>

            {formError && (
              <InlineAlert tone="error" className="mt-5">
                {formError}
              </InlineAlert>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
              {activeStep > CHOICE_STEP && (
                <Button variant="ghost" onClick={() => goToStep(activeStep - 1)}>
                  <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
                  {stepCopy.back}
                </Button>
              )}
              <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center sm:gap-4">
                {activeStep === DETAILS_STEP && session.isChecked && !session.user && (
                  <p className="text-center text-xs text-ink-muted sm:text-right">{copy.signInNote}</p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || (activeStep === DETAILS_STEP && (!hasSelections || !session.isChecked))}
                  className="w-full sm:w-auto sm:min-w-44"
                >
                  {activeStep !== DETAILS_STEP ? stepCopy.continue : isSubmitting ? copy.submit.busy : session.user ? copy.submit.idle : copy.submit.signIn}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Desktop companion: live summary and what to prepare, so the form itself stays short */}
        <aside aria-labelledby="booking-summary-title" className="hidden lg:sticky lg:top-24 lg:block">
          <Card padding="md">
            <h2 id="booking-summary-title" className="text-h4 text-ink">
              {summaryCopy.title}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <SummaryRow
                label={summaryCopy.type}
                value={draft.ConsultationType ? labels.consultationType(draft.ConsultationType) : summaryCopy.notSelected}
                isMissing={!draft.ConsultationType}
              />
              <SummaryRow label={summaryCopy.mode} value={draft.Mode ? labels.consultationMode(draft.Mode) : summaryCopy.notSelected} isMissing={!draft.Mode} />
              <SummaryRow label={summaryCopy.when} value={whenLabel || summaryCopy.notSelected} isMissing={!selectedSlot} />
              <div className="border-t border-line pt-2">
                <SummaryRow label={summaryCopy.fee} value={summaryCopy.feeValue} />
              </div>
            </dl>

            <h3 className="mt-5 border-t border-line pt-4 text-sm font-semibold text-ink">{copy.preparation.title}</h3>
            <ul className="mt-2 space-y-1.5">
              {copy.preparation.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm leading-5 text-ink-muted">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.5} />
                  {tip}
                </li>
              ))}
            </ul>
            <LocaleLink href="/faq" className="mt-4 block text-sm font-semibold text-primary hover:underline">
              {summaryCopy.faqLink}
            </LocaleLink>
          </Card>
        </aside>
      </div>
    </div>
  );
}
