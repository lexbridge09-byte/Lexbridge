'use client';

import { ArrowLeft, Check, CircleCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONSULTATION_MODES, CONSULTATION_TYPES, getIntakeFields, getIntakeSubtypes } from '@lexbridge/shared';
import { useDictionary, useLocale } from '@/brand/localeContext';
import { CheckboxField, FieldError, SelectField, TextAreaField, TextField } from '@/components/formFields';
import { LocaleLink } from '@/components/localeLink';
import { Button, ButtonLink, Card, InlineAlert, SkeletonList, StepIndicator } from '@/components/ui';
import { WhatsAppOptInField } from '@/components/whatsAppOptInField';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { deriveLoginHref } from '@/lib/safeRedirect';
import { deriveConsultationFlow, deriveSlotSelection } from '@/lib/consultationSlots';
import { formatDateKey } from '@/lib/formatValues';
import { useIsFeatureEnabled } from '@/components/featuresProvider';

const FORM_ID = 'consultation-form';
const DRAFT_STORAGE_KEY = 'lexbridge.consultationDraft';
const EMPTY_DRAFT = { ConsultationType: '', Mode: '', SlotId: '', FullName: '', Email: '', Phone: '', Description: '', WhatsAppOptIn: false, IntakeCategory: '', IntakeSubtype: '', IntakeDetails: {} };
const INTAKE_CHIP_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center rounded-control border border-line bg-card px-3.5 py-2 text-sm font-semibold text-ink transition-colors duration-(--dur-150) hover:border-primary-100 has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:text-primary-dark';
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
  'flex h-full cursor-pointer items-start gap-3 rounded-card border border-line bg-card p-3.5 transition-colors duration-(--dur-150) hover:border-line-strong has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:ring-2 has-[:checked]:ring-primary-100 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';

const CHIP_CLASS =
  'inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-(--dur-150) focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary';

function SummaryRow({ label, value, isMissing }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`text-right ${isMissing ? 'text-ink-muted' : 'font-semibold text-ink'}`}>{value}</dd>
    </div>
  );
}

/*
  Available times: consultation -> date/time -> details. No available times:
  consultation -> request details. Choices survive both paths and slot conflicts.
*/
export function ConsultationBooking() {
  const dictionary = useDictionary();
  const isUploadsEnabled = useIsFeatureEnabled('documentUploads');
  const isWhatsAppOptInEnabled = useIsFeatureEnabled('whatsAppNotifications');
  const copy = dictionary.consultation;
  const stepCopy = dictionary.forms.serviceRequest;
  const summaryCopy = dictionary.ux.bookingSummary;
  const locale = useLocale();
  const labels = useCatalogLabels();
  const format = useFormatters();
  const stepStatusRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const [session, setSession] = useState({ isChecked: false, user: null });
  const intakeCopy = dictionary.intake;
  const [slotsState, setSlotsState] = useState({ isLoaded: false, slots: [], error: '' });
  const [slotsReloadCount, setSlotsReloadCount] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const intakeSubtypeKeys = draft.IntakeCategory ? getIntakeSubtypes(draft.IntakeCategory) : [];
  const [step, setStep] = useState(CHOICE_STEP);
  const [stepDirection, setStepDirection] = useState('forward');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState(null);
  const [requestReference, setRequestReference] = useState('');

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
          return {
            ...restored,
            FullName: restored.FullName || user?.FullName || '',
            Email: restored.Email || user?.Email || '',
            Phone: restored.Phone || user?.Phone || '',
          };
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
  const { selectedSlot, activeGroup } = deriveSlotSelection(slotGroups, draft.SlotId, selectedDateKey, slotsState.isLoaded);
  const hasChoice = Boolean(draft.ConsultationType && draft.Mode);
  const flow = deriveConsultationFlow({ step, hasChoice, selectedSlot, isLoaded: slotsState.isLoaded, error: slotsState.error, slotCount: slotsState.slots.length });
  const { activeStep, isRequestFlow, isAvailabilityReady } = flow;
  const stepNames = isRequestFlow ? copy.request.steps : dictionary.ux.steps.booking;
  const hasSelections = Boolean(hasChoice && (isRequestFlow || selectedSlot));

  function reloadSlots() {
    setSlotsState({ isLoaded: false, slots: [], error: '' });
    setSlotsReloadCount((count) => count + 1);
  }

  function updateIntakeDetail(key, value) {
    updateDraft('IntakeDetails', { ...draft.IntakeDetails, [key]: value });
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  }

  function goToStep(nextStep) {
    setStepDirection(nextStep >= activeStep ? 'forward' : 'back');
    setStep(nextStep);
    setFormError('');
    requestAnimationFrame(() => stepStatusRef.current?.focus());
  }

  function validateStep() {
    if (activeStep === CHOICE_STEP) {
      const errors = {
        ...(!draft.ConsultationType && { ConsultationType: copy.validation.type }),
        ...(!draft.Mode && { Mode: copy.validation.mode }),
      };
      // Required topic questions for the chosen subtype
      for (const field of getIntakeFields(draft.IntakeSubtype) ?? []) {
        if (field.required && !String(draft.IntakeDetails[field.key] ?? '').trim()) {
          errors[`IntakeDetails.${field.key}`] = dictionary.intake.fieldRequired;
        }
      }
      return errors;
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
    if (isSubmittingRef.current || !isAvailabilityReady) return;
    setFormError('');

    if (activeStep !== DETAILS_STEP) {
      const errors = validateStep();
      setFieldErrors(errors);
      if (Object.keys(errors).length === 0) goToStep(flow.nextStep);
      return;
    }
    if (!hasSelections) return;
    if (!isRequestFlow && !session.user) {
      goToSignIn();
      return;
    }
    const errors = {
      ...(!hasConsented && { ConsentGiven: copy.validation.consent }),
      ...(!/^\+?[\d\s-]{8,18}$/.test(draft.Phone.trim()) && { Phone: copy.validation.phone }),
      ...(draft.Description.trim().length < (isRequestFlow ? 20 : 10) && { Description: isRequestFlow ? copy.request.descriptionError : copy.validation.description }),
      ...(isRequestFlow && draft.FullName.trim().length < 2 && { FullName: copy.request.nameError }),
      ...(isRequestFlow && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.Email.trim()) && { Email: copy.request.emailError }),
    };
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      if (isRequestFlow) {
        const data = await requestApi('/service-requests', {
          method: 'POST',
          body: {
            FullName: draft.FullName.trim(),
            Email: draft.Email.trim(),
            Phone: draft.Phone.trim(),
            ServiceCategory: 'legal-consultation',
            Subtype: draft.IntakeSubtype,
            IntakeDetails: draft.IntakeDetails,
            Description: `Consultation request (no available slot).\nType: ${draft.ConsultationType}\nPreferred mode: ${draft.Mode}\nMatter category: ${draft.IntakeCategory || 'Not specified'}\n\n${draft.Description.trim()}`,
            Source: 'contact-form',
            PreferredLanguage: locale,
            ConsentGiven: hasConsented,
            WhatsAppOptIn: draft.WhatsAppOptIn,
          },
        });
        clearDraft();
        setRequestReference(data.ReferenceCode);
        return;
      }
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
          IntakeCategory: draft.IntakeCategory || undefined,
          IntakeSubtype: draft.IntakeSubtype,
          IntakeDetails: draft.IntakeDetails,
        },
      });
      clearDraft();
      setBooking(data.consultation);
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } catch (error) {
      if (error.status === 401) {
        goToSignIn();
        return;
      }
      if (error.status === 409) {
        updateDraft('SlotId', '');
        reloadSlots();
        goToStep(TIME_STEP);
        setFormError(copy.slots.taken);
      } else {
        setFieldErrors(localizeFieldErrors(error, dictionary));
        setFormError(localizeApiError(error, dictionary));
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const stepIndicator = (
    isAvailabilityReady && <StepIndicator label={dictionary.ux.steps.label} steps={stepNames} current={booking || requestReference ? stepNames.length + 1 : flow.currentStep} className="mb-4" />
  );
  const whenLabel = selectedSlot ? copy.success.whenValue(format.shortDay(selectedSlot.StartsAt), format.time(selectedSlot.StartsAt)) : '';

  if (requestReference) {
    return (
      <Card padding="lg" role="status" className="mx-auto max-w-2xl">
        <CircleCheck aria-hidden="true" className="size-10 text-success" />
        <h2 className="mt-4 text-h3 text-ink">{copy.request.successTitle}</h2>
        <p className="mt-2 leading-7 text-ink-muted">{copy.request.successBody}</p>
        <dl className="mt-5 rounded-control bg-card-dim p-4">
          <dt className="text-sm text-ink-muted">{copy.success.referenceLabel}</dt>
          <dd className="mt-1 break-all font-mono font-semibold text-ink">{requestReference}</dd>
        </dl>
        <ButtonLink href={session.user ? `/dashboard/requests/${requestReference}` : deriveLoginHref(`/dashboard/requests/${requestReference}`, locale)} className="mt-5">
          {copy.request.viewRequest}
        </ButtonLink>
      </Card>
    );
  }

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
            {isUploadsEnabled && (
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
        <Card padding="lg" className="min-w-0">
          <p ref={stepStatusRef} tabIndex={-1} aria-live="polite" className="sr-only">
            {isAvailabilityReady ? stepCopy.stepStatus(flow.currentStep, stepNames.length, stepNames[flow.currentStep - 1]) : copy.slots.loading}
          </p>
          <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
            <fieldset disabled={isSubmitting} className="min-w-0">
            <div hidden={activeStep !== CHOICE_STEP} className={`space-y-6 motion-safe:${stepDirection === 'back' ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}>
              {!slotsState.isLoaded ? (
                <InlineAlert role="status">{copy.slots.loading}</InlineAlert>
              ) : slotsState.error ? (
                <InlineAlert tone="error" title={copy.slots.errorTitle}>
                  <p>{copy.slots.errorBody}</p>
                  <Button variant="link" onClick={reloadSlots} className="mt-2">{copy.slots.retry}</Button>
                </InlineAlert>
              ) : isRequestFlow ? (
                <InlineAlert title={copy.request.noticeTitle} role="status">
                  <p>{copy.request.noticeBody}</p>
                  <Button variant="link" onClick={reloadSlots} className="mt-2">{copy.request.checkAgain}</Button>
                </InlineAlert>
              ) : (
                <p className="rounded-control border border-success/20 bg-success-50 px-4 py-3 text-sm text-success" role="status">{copy.slots.available}</p>
              )}
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

              {/* Topic intake: tells the 2nd owner what kind of matter this is before they assign */}
              <fieldset className="motion-safe:animate-fade-in rounded-xl border border-line bg-card-dim/60 p-4">
                <legend className="px-1 text-h4 text-ink">{intakeCopy.topicTitle}</legend>
                <p className="mt-1 text-sm text-ink-muted">{intakeCopy.topicIntro}</p>
                <div className="mt-3 space-y-3">
                  <SelectField
                    label={intakeCopy.categoryLabel}
                    name="IntakeCategory"
                    options={labels.serviceOptions}
                    placeholder={intakeCopy.categoryPlaceholder}
                    value={draft.IntakeCategory}
                    onChange={(event) => {
                      // New area invalidates the previous subtype choice and its answers
                      updateDraft('IntakeCategory', event.target.value);
                      updateDraft('IntakeSubtype', '');
                      updateDraft('IntakeDetails', {});
                    }}
                  />
                  {draft.IntakeCategory && intakeSubtypeKeys.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink">{intakeCopy.subtypeLabel}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {intakeSubtypeKeys.map((key) => (
                          <label key={key} className={INTAKE_CHIP_CLASS}>
                            <input
                              type="radio"
                              name="IntakeSubtype"
                              value={key}
                              checked={draft.IntakeSubtype === key}
                              onChange={() => updateDraft('IntakeSubtype', key)}
                              className="sr-only"
                            />
                            {intakeCopy.subtypes[key]?.label ?? key}
                          </label>
                        ))}
                      </div>
                      <FieldError id="IntakeSubtype-error" message={fieldErrors.IntakeSubtype} />
                    </div>
                  )}
                  {draft.IntakeSubtype && (getIntakeFields(draft.IntakeSubtype) ?? []).length > 0 && (
                    <div className="stagger grid gap-3 sm:grid-cols-2" key={draft.IntakeSubtype}>
                      {(getIntakeFields(draft.IntakeSubtype) ?? []).map((field) => {
                        const name = `IntakeDetails.${field.key}`;
                        const label = intakeCopy.fields[field.key]?.label ?? field.key;
                        const value = draft.IntakeDetails[field.key] ?? '';
                        const setError = fieldErrors[name];
                        if (field.type === 'select') {
                          const options = (field.options ?? []).map((optionKey) => ({ value: optionKey, label: intakeCopy.options[optionKey] ?? optionKey }));
                          return <SelectField key={field.key} label={label} name={name} options={options} placeholder={intakeCopy.choose} required={field.required} error={setError} value={value} onChange={(event) => updateIntakeDetail(field.key, event.target.value)} />;
                        }
                        if (field.type === 'date') {
                          return <TextField key={field.key} label={label} name={name} type="date" required={field.required} error={setError} value={value} onChange={(event) => updateIntakeDetail(field.key, event.target.value)} />;
                        }
                        return <TextField key={field.key} label={label} name={name} type="text" maxLength={field.maxLength ?? 300} required={field.required} error={setError} value={value} onChange={(event) => updateIntakeDetail(field.key, event.target.value)} />;
                      })}
                    </div>
                  )}
                </div>
              </fieldset>
            </div>

            <fieldset hidden={isRequestFlow || activeStep !== TIME_STEP} aria-busy={!slotsState.isLoaded} className={`min-w-0 motion-safe:${stepDirection === 'back' ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}>
              <legend className="text-h4 text-ink">{copy.sections.slot}</legend>
              <p className="mt-1 text-sm text-ink-muted">{copy.timeZoneNote}</p>

              {!slotsState.isLoaded ? (
                <div className="mt-3" role="status">
                  <p className="mb-2 text-sm text-ink-muted">{copy.slots.loading}</p>
                  <SkeletonList label={copy.slots.loading} rows={2} />
                </div>
              ) : slotsState.error ? (
                <InlineAlert tone="error" className="mt-3">
                  <p>{slotsState.error}</p>
                  <Button variant="link" onClick={reloadSlots} className="mt-1">
                    {copy.slots.retry}
                  </Button>
                </InlineAlert>
              ) : (
                <>
                  <div role="group" aria-label={copy.slots.datesLabel} className="mt-3 flex flex-wrap gap-2">
                    {slotGroups.map((group) => {
                      const isActive = group.dateKey === activeGroup?.dateKey;
                      return (
                        <button
                          key={group.dateKey}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setSelectedDateKey(group.dateKey);
                            if (!isActive) updateDraft('SlotId', '');
                          }}
                          className={`${CHIP_CLASS} ${isActive ? 'border-primary bg-primary text-ink' : 'border-line bg-card text-ink hover:border-line-strong'}`}
                        >
                          {format.shortDay(group.daySlots[0].StartsAt)}
                        </button>
                      );
                    })}
                  </div>
                  {activeGroup && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-ink">{format.day(activeGroup.daySlots[0].StartsAt)}</p>
                      <div role="radiogroup" aria-label={copy.slots.timesLabel} aria-describedby={fieldErrors.SlotId ? 'SlotId-error' : undefined} aria-invalid={Boolean(fieldErrors.SlotId)} className="mt-2 flex flex-wrap gap-2">
                        {activeGroup.daySlots.map((slot) => (
                          <label
                            key={slot._id}
                            className={`${CHIP_CLASS} tabular cursor-pointer ${draft.SlotId === slot._id ? 'border-primary bg-primary-50 text-primary-dark' : 'border-line bg-card text-ink hover:border-line-strong'}`}
                          >
                            <input
                              type="radio"
                              name="SlotId"
                              value={slot._id}
                              checked={draft.SlotId === slot._id}
                              onChange={() => updateDraft('SlotId', slot._id)}
                              className="radio"
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

            <fieldset hidden={activeStep !== DETAILS_STEP} className={`space-y-4 motion-safe:${stepDirection === 'back' ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}>
              <legend className="text-h4 text-ink">{copy.sections.details}</legend>
              {isRequestFlow && (
                <>
                  <InlineAlert title={copy.request.title}>{copy.request.noticeBody}</InlineAlert>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField name="FullName" label={copy.request.fullName} autoComplete="name" required maxLength={120} value={draft.FullName} onChange={(event) => updateDraft('FullName', event.target.value)} error={fieldErrors.FullName} />
                    <TextField name="Email" label={copy.request.email} type="email" autoComplete="email" required maxLength={254} value={draft.Email} onChange={(event) => updateDraft('Email', event.target.value)} error={fieldErrors.Email} />
                  </div>
                </>
              )}
              {selectedSlot && (
                <p className="rounded-xl bg-card-dim px-3.5 py-2.5 text-sm text-ink lg:hidden">
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
                hint={isRequestFlow ? copy.request.phoneHint : copy.fields.phoneHint}
                required
                error={fieldErrors.Phone}
                className="max-w-md"
              />
              <TextAreaField
                label={copy.fields.descriptionLabel}
                name="Description"
                rows={3}
                maxLength={3000}
                required
                value={draft.Description}
                onChange={(event) => updateDraft('Description', event.target.value)}
                hint={isRequestFlow ? copy.request.descriptionHint : copy.fields.descriptionHint}
                error={fieldErrors.Description}
              />

              {(session.user || isRequestFlow) && (
                <CheckboxField
                  name="ConsentGiven"
                  checked={hasConsented}
                  onChange={(event) => setHasConsented(event.target.checked)}
                  error={fieldErrors.ConsentGiven}
                >
                  {copy.consent.before}
                  <LocaleLink href="/legal/privacy" className="font-semibold text-primary-dark underline underline-offset-4">
                    {copy.consent.link}
                  </LocaleLink>
                  {copy.consent.after}
                </CheckboxField>
              )}

              {isWhatsAppOptInEnabled && (
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
                <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => goToStep(flow.previousStep)}>
                  <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
                  {stepCopy.back}
                </Button>
              )}
              <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center sm:gap-4">
                {activeStep === DETAILS_STEP && !isRequestFlow && session.isChecked && !session.user && (
                  <p className="text-center text-xs text-ink-muted sm:text-right">{copy.signInNote}</p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || !isAvailabilityReady || (activeStep === TIME_STEP && !selectedSlot) || (activeStep === DETAILS_STEP && (!hasSelections || !session.isChecked))}
                  className="w-full sm:w-auto sm:min-w-44"
                >
                  {activeStep !== DETAILS_STEP ? stepCopy.continue : isSubmitting ? (isRequestFlow ? copy.request.busy : copy.submit.busy) : isRequestFlow ? copy.request.submit : session.user ? copy.submit.idle : copy.submit.signIn}
                </Button>
              </div>
            </div>
            </fieldset>
          </form>
        </Card>

        {/* Desktop companion: live summary and what to prepare, so the form itself stays short */}
        <aside aria-labelledby="booking-summary-title" className="hidden lg:sticky lg:top-24 lg:block">
          <Card padding="md">
            <h2 id="booking-summary-title" className="text-h4 text-ink">
              {isRequestFlow ? copy.request.title : summaryCopy.title}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <SummaryRow
                label={summaryCopy.type}
                value={draft.ConsultationType ? labels.consultationType(draft.ConsultationType) : summaryCopy.notSelected}
                isMissing={!draft.ConsultationType}
              />
              <SummaryRow label={summaryCopy.mode} value={draft.Mode ? labels.consultationMode(draft.Mode) : summaryCopy.notSelected} isMissing={!draft.Mode} />
              <SummaryRow label={summaryCopy.when} value={isRequestFlow ? copy.request.timePending : whenLabel || summaryCopy.notSelected} isMissing={!isRequestFlow && !selectedSlot} />
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
            <LocaleLink href="/faq" className="mt-4 block text-sm font-semibold text-primary-dark hover:underline">
              {summaryCopy.faqLink}
            </LocaleLink>
          </Card>
        </aside>
      </div>
    </div>
  );
}
