'use client';

import { ArrowLeft, ArrowRight, Check, CircleCheck, FileText, MessageSquare, Phone, RotateCw, Timer, Video } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONSULTATION_MODES, CONSULTATION_TYPES, getIntakeFields, getIntakeSubtypes } from '@lexbridge/shared';
import { useDictionary, useLocale } from '@/brand/localeContext';
import { CheckboxField, FieldError, SelectField, TextAreaField, TextField, revealFormTop, STICKY_FORM_ACTIONS_CLASS } from '@/components/formFields';
import { CalendlyEmbed } from '@/components/calendlyEmbed';
import { useIsFeatureEnabled } from '@/components/featuresProvider';
import { InfoTip } from '@/components/infoTip';
import { LocaleLink } from '@/components/localeLink';
import { Button, ButtonLink, Card, FormSheet, InlineAlert, SkeletonList } from '@/components/ui';
import { WhatsAppOptInField } from '@/components/whatsAppOptInField';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { CONSULTATION_STEPS, deriveConsultationFlow, deriveSlotSelection } from '@/lib/consultationSlots';
import { formatDateKey } from '@/lib/formatValues';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { deriveLoginHref } from '@/lib/safeRedirect';

const FORM_ID = 'consultation-form';
const DRAFT_STORAGE_KEY = 'lexbridge.consultationDraft';
const EMPTY_DRAFT = { ConsultationType: '', Mode: '', SlotId: '', FullName: '', Email: '', Phone: '', Description: '', WhatsAppOptIn: false, IntakeCategory: '', IntakeSubtype: '', IntakeDetails: {} };
const { choice: CHOICE_STEP, matter: MATTER_STEP, time: TIME_STEP, details: DETAILS_STEP } = CONSULTATION_STEPS;
const STEP_KEYS = { [CHOICE_STEP]: 'choice', [MATTER_STEP]: 'matter', [TIME_STEP]: 'time', [DETAILS_STEP]: 'details' };
const EASE_OUT_SOFT = [0.23, 1, 0.32, 1];

// Icon per consultation type / mode (keys from @lexbridge/shared consultationCatalog)
const CHOICE_ICONS = { quick: Timer, detailed: MessageSquare, document: FileText, phone: Phone, video: Video };

// Steps slide in from the side they're travelling towards (forward → from right, back → from left)
const STEP_VARIANTS = {
  enter: (direction) => ({ opacity: 0, x: direction === 'back' ? -28 : 28 }),
  shown: { opacity: 1, x: 0, transition: { duration: 0.28, ease: EASE_OUT_SOFT } },
  leave: (direction) => ({ opacity: 0, x: direction === 'back' ? 28 : -28, transition: { duration: 0.16, ease: EASE_OUT_SOFT } }),
};

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

// Time-of-day bucket (India time) for grouping slot buttons
function deriveDayPeriod(startsAt) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date(startsAt)));
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

// Large tappable radio card: icon, title, one line; selected state glows rose gold with a tick
function ChoiceCard({ name, choiceKey, title, summary, checked, onChange, isCompact = false }) {
  const Icon = CHOICE_ICONS[choiceKey] ?? MessageSquare;
  return (
    <label
      className={`group relative flex h-full cursor-pointer gap-3 rounded-card border bg-card transition-[border-color,background-color,box-shadow,transform] duration-(--dur-200) active:scale-(--press-scale) has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${isCompact ? 'items-center p-3.5' : 'flex-col p-4'} ${checked ? 'border-primary bg-primary-50 shadow-glow' : 'border-line hover:-translate-y-0.5 hover:border-line-strong'}`}
    >
      <input type="radio" name={name} value={choiceKey} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-(--dur-200) ${checked ? 'bg-primary text-canvas' : 'bg-card-dim text-primary-dark'}`}>
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 pr-6">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-ink-muted">{summary}</span>
      </span>
      <span
        aria-hidden="true"
        className={`absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border transition-colors duration-(--dur-200) ${checked ? 'border-primary bg-primary text-white' : 'border-line-strong text-transparent'}`}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </label>
  );
}

/*
  Booking wizard, one short screen per step:
  type & mode → matter (optional topic) → date & time → contact details.
  With no open times the time step is skipped and the last step sends a request instead.
  Choices survive Back, sign-in round trips (session draft) and slot conflicts.
*/
export function ConsultationBooking() {
  const dictionary = useDictionary();
  const isUploadsEnabled = useIsFeatureEnabled('documentUploads');
  const isWhatsAppOptInEnabled = useIsFeatureEnabled('whatsAppNotifications');
  const copy = dictionary.consultation;
  const wizardCopy = copy.wizard;
  const stepCopy = dictionary.forms.serviceRequest;
  const summaryCopy = dictionary.ux.bookingSummary;
  const intakeCopy = dictionary.intake;
  const locale = useLocale();
  const labels = useCatalogLabels();
  const format = useFormatters();
  const isReduced = useReducedMotion();
  const stepStatusRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const [session, setSession] = useState({ isChecked: false, user: null });
  const [slotsState, setSlotsState] = useState({ isLoaded: false, slots: [], error: '' });
  const [slotsReloadCount, setSlotsReloadCount] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [step, setStep] = useState(CHOICE_STEP);
  const [stepDirection, setStepDirection] = useState('forward');
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState(null);
  const [requestReference, setRequestReference] = useState('');
  // Booking provider: built-in slots, or the embedded Calendly calendar (chosen in admin → Slots)
  const [bookingProvider, setBookingProvider] = useState({ provider: 'builtin', calendlyUrl: '' });
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);
  const intakeSubtypeKeys = draft.IntakeCategory ? getIntakeSubtypes(draft.IntakeCategory) : [];
  const intakeFields = draft.IntakeSubtype ? (getIntakeFields(draft.IntakeSubtype) ?? []) : [];

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
    requestApi('/consultations/booking-provider')
      .then((data) => {
        if (!isCancelled && data?.provider) setBookingProvider(data);
      })
      .catch(() => {});
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
  const isCalendly = bookingProvider.provider === 'calendly';
  const flow = deriveConsultationFlow({
    step,
    hasChoice,
    selectedSlot,
    isLoaded: isCalendly || slotsState.isLoaded,
    error: isCalendly ? '' : slotsState.error,
    slotCount: isCalendly ? 0 : slotsState.slots.length,
  });
  const { activeStep, isRequestFlow: isSlotlessFlow, isAvailabilityReady } = flow;
  // "Request" means: no times open, send a requirement. Calendly is slotless too, but it books.
  const isRequestFlow = isSlotlessFlow && !isCalendly;
  const stepNames = isSlotlessFlow ? wizardCopy.requestSteps : wizardCopy.steps;
  const stepKey = STEP_KEYS[activeStep];
  const hasSelections = Boolean(hasChoice && (isSlotlessFlow || selectedSlot));
  const whenLabel = selectedSlot ? copy.success.whenValue(format.shortDay(selectedSlot.StartsAt), format.time(selectedSlot.StartsAt)) : '';

  function reloadSlots() {
    setSlotsState({ isLoaded: false, slots: [], error: '' });
    setSlotsReloadCount((count) => count + 1);
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  }

  function updateIntakeDetail(key, value) {
    setDraft((current) => ({ ...current, IntakeDetails: { ...current.IntakeDetails, [key]: value } }));
    setFieldErrors((current) => (current[`IntakeDetails.${key}`] ? { ...current, [`IntakeDetails.${key}`]: '' } : current));
  }

  function goToStep(nextStep) {
    setStepDirection(nextStep >= activeStep ? 'forward' : 'back');
    setStep(nextStep);
    setFormError('');
    revealFormTop(document.getElementById(FORM_ID));
    requestAnimationFrame(() => stepStatusRef.current?.focus());
  }

  function validateStep() {
    if (activeStep === CHOICE_STEP) {
      return {
        ...(!draft.ConsultationType && { ConsultationType: copy.validation.type }),
        ...(!draft.Mode && { Mode: copy.validation.mode }),
      };
    }
    if (activeStep === MATTER_STEP) {
      const errors = {};
      for (const field of intakeFields) {
        if (field.required && !String(draft.IntakeDetails[field.key] ?? '').trim()) errors[`IntakeDetails.${field.key}`] = intakeCopy.fieldRequired;
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

    if (isCalendly) {
      setFieldErrors({});
      setIsCalendlyOpen(true);
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

  async function recordCalendlyBooking({ eventUri, inviteeUri }) {
    setIsSubmitting(true);
    setFormError('');
    try {
      const data = await requestApi('/consultations/calendly', {
        method: 'POST',
        body: {
          EventUri: eventUri,
          InviteeUri: inviteeUri,
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
      setIsCalendlyOpen(false);
      setBooking(data.consultation);
    } catch (error) {
      setFormError(localizeApiError(error, dictionary));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Done screens ────────────────────────────────────────────────────────────

  if (requestReference) {
    return (
      <Card padding="lg" role="status" className="mx-auto max-w-2xl">
        <CircleCheck aria-hidden="true" className="size-10 text-success" />
        <h2 className="mt-4 font-heading text-3xl font-bold text-ink">{copy.request.successTitle}</h2>
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
      <Card padding="lg" role="status" className="mx-auto max-w-3xl">
        <motion.span
          initial={isReduced ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          className="flex size-14 items-center justify-center rounded-full bg-success text-white"
        >
          <Check aria-hidden="true" className="size-7" strokeWidth={3} />
        </motion.span>
        <h2 className="mt-4 font-heading text-3xl font-bold text-ink">{copy.success.title}</h2>
        <dl className="mt-5 grid gap-4 rounded-xl bg-success-50 p-5 sm:grid-cols-2">
          {[
            [copy.success.referenceLabel, booking.ReferenceCode],
            [copy.success.consultationLabel, labels.consultationType(booking.ConsultationType)],
            [copy.success.whenLabel, copy.success.whenValue(format.day(booking.StartsAt), format.time(booking.StartsAt))],
            [copy.success.modeLabel, labels.consultationMode(booking.Mode)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
              <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
            </div>
          ))}
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
    );
  }

  if (isCalendly && isCalendlyOpen) {
    return (
      <FormSheet className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsCalendlyOpen(false)}>
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
            {stepCopy.back}
          </Button>
          <h2 className="font-heading text-2xl font-bold text-ink">{wizardCopy.titles.time}</h2>
        </div>
        {formError && <InlineAlert tone="error" className="mb-3">{formError}</InlineAlert>}
        {isSubmitting && <p role="status" className="mb-3 text-sm text-ink-muted">{copy.slots.loading}</p>}
        <CalendlyEmbed url={bookingProvider.calendlyUrl} name={session.user?.FullName ?? draft.FullName} email={session.user?.Email ?? draft.Email} onScheduled={recordCalendlyBooking} />
      </FormSheet>
    );
  }

  // ── Step screens ────────────────────────────────────────────────────────────

  const availabilityNotice = !slotsState.isLoaded ? (
    <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
      <RotateCw aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={2} />
      {copy.slots.loading}
    </p>
  ) : slotsState.error ? (
    <InlineAlert tone="error" title={copy.slots.errorTitle}>
      <p>{copy.slots.errorBody}</p>
      <Button variant="link" onClick={reloadSlots} className="mt-1">{copy.slots.retry}</Button>
    </InlineAlert>
  ) : isRequestFlow ? (
    <div role="status" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-control bg-primary-50 px-4 py-3 text-sm ring-1 ring-primary-100">
      <p>
        <span className="font-semibold text-ink">{copy.request.noticeTitle}.</span> <span className="text-ink-muted">{copy.request.noticeBody}</span>
      </p>
      <button type="button" onClick={reloadSlots} className="font-semibold text-primary-dark underline-offset-4 hover:underline">
        {copy.request.checkAgain}
      </button>
    </div>
  ) : null;

  const stepContent = {
    choice: (
      <div className="space-y-4">
        {availabilityNotice}
        <fieldset>
          <legend className="text-sm font-semibold text-ink">{copy.sections.type}</legend>
          <div className="mt-2.5 grid gap-3 md:grid-cols-3">
            {CONSULTATION_TYPES.map((type) => (
              <ChoiceCard
                key={type.key}
                name="ConsultationType"
                choiceKey={type.key}
                title={labels.consultationType(type.key)}
                summary={labels.consultationTypeSummary(type.key)}
                checked={draft.ConsultationType === type.key}
                onChange={() => updateDraft('ConsultationType', type.key)}
              />
            ))}
          </div>
          <FieldError id="ConsultationType-error" message={fieldErrors.ConsultationType} />
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold text-ink">{copy.sections.mode}</legend>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
            {CONSULTATION_MODES.map((mode) => (
              <ChoiceCard
                key={mode.key}
                name="Mode"
                choiceKey={mode.key}
                title={labels.consultationMode(mode.key)}
                summary={labels.consultationModeSummary(mode.key)}
                checked={draft.Mode === mode.key}
                onChange={() => updateDraft('Mode', mode.key)}
                isCompact
              />
            ))}
          </div>
          <FieldError id="Mode-error" message={fieldErrors.Mode} />
        </fieldset>
      </div>
    ),

    matter: (
      <div className="space-y-4">
        <SelectField
          label={intakeCopy.categoryLabel}
          name="IntakeCategory"
          options={labels.serviceOptions}
          placeholder={intakeCopy.categoryPlaceholder}
          value={draft.IntakeCategory}
          onChange={(event) => {
            // A new area invalidates the previous subtype and its answers
            setDraft((current) => ({ ...current, IntakeCategory: event.target.value, IntakeSubtype: '', IntakeDetails: {} }));
          }}
        />
        {draft.IntakeCategory && intakeSubtypeKeys.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-ink">{intakeCopy.subtypeLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {intakeSubtypeKeys.map((key) => {
                const isChosen = draft.IntakeSubtype === key;
                return (
                  <label
                    key={key}
                    className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors duration-(--dur-150) active:scale-(--press-scale) has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${isChosen ? 'border-primary bg-primary text-canvas' : 'border-line bg-card text-ink hover:border-primary/60'}`}
                  >
                    <input type="radio" name="IntakeSubtype" value={key} checked={isChosen} onChange={() => updateDraft('IntakeSubtype', key)} className="sr-only" />
                    {isChosen && <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />}
                    {intakeCopy.subtypes[key]?.label ?? key}
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {intakeFields.length > 0 && (
          <div className="stagger grid gap-3 sm:grid-cols-2" key={draft.IntakeSubtype}>
            {intakeFields.map((field) => {
              const name = `IntakeDetails.${field.key}`;
              const label = intakeCopy.fields[field.key]?.label ?? field.key;
              const value = draft.IntakeDetails[field.key] ?? '';
              if (field.type === 'select') {
                const options = (field.options ?? []).map((optionKey) => ({ value: optionKey, label: intakeCopy.options[optionKey] ?? optionKey }));
                return <SelectField key={field.key} label={label} name={name} options={options} placeholder={intakeCopy.choose} required={field.required} error={fieldErrors[name]} value={value} onChange={(event) => updateIntakeDetail(field.key, event.target.value)} />;
              }
              return (
                <TextField
                  key={field.key}
                  label={label}
                  name={name}
                  type={field.type === 'date' ? 'date' : 'text'}
                  maxLength={field.type === 'date' ? undefined : (field.maxLength ?? 300)}
                  required={field.required}
                  error={fieldErrors[name]}
                  value={value}
                  onChange={(event) => updateIntakeDetail(field.key, event.target.value)}
                />
              );
            })}
          </div>
        )}
      </div>
    ),

    time: !slotsState.isLoaded ? (
      <div role="status">
        <SkeletonList label={copy.slots.loading} rows={2} />
      </div>
    ) : slotsState.error ? (
      availabilityNotice
    ) : (
      <div>
        {/* Date strip: one card per day with how many times are open */}
        <div role="group" aria-label={copy.slots.datesLabel} className="scroll-row -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
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
                className={`flex min-w-24 shrink-0 flex-col items-center rounded-card border px-3 py-2.5 text-center transition-[border-color,background-color,transform] duration-(--dur-150) active:scale-(--press-scale) ${isActive ? 'border-primary bg-primary text-canvas shadow-glow' : 'border-line bg-card text-ink hover:border-line-strong'}`}
              >
                <span className="text-sm font-semibold">{format.shortDay(group.daySlots[0].StartsAt)}</span>
                <span className={`mt-0.5 text-xs ${isActive ? 'text-canvas/75' : 'text-ink-muted'}`}>{copy.slots.timesCount.replace('{count}', group.daySlots.length)}</span>
              </button>
            );
          })}
        </div>
        {activeGroup && (
          <motion.div key={activeGroup.dateKey} initial={isReduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
            <div role="radiogroup" aria-label={copy.slots.timesLabel} aria-describedby={fieldErrors.SlotId ? 'SlotId-error' : undefined} aria-invalid={Boolean(fieldErrors.SlotId)} className="scroll-soft max-h-[42vh] space-y-4 overflow-y-auto pr-1">
              {['morning', 'afternoon', 'evening'].map((period) => {
                const periodSlots = activeGroup.daySlots.filter((slot) => deriveDayPeriod(slot.StartsAt) === period);
                if (periodSlots.length === 0) return null;
                return (
                  <div key={period}>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{copy.slots.periods[period]}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {periodSlots.map((slot) => {
                        const isChosen = draft.SlotId === slot._id;
                        return (
                          <label
                            key={slot._id}
                            className={`tabular flex min-h-11 cursor-pointer items-center justify-center rounded-control border text-sm font-semibold transition-[border-color,background-color,transform] duration-(--dur-150) active:scale-(--press-scale) has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${isChosen ? 'border-primary bg-primary text-canvas shadow-glow' : 'border-line bg-card text-ink hover:border-primary/60'}`}
                          >
                            <input type="radio" name="SlotId" value={slot._id} checked={isChosen} onChange={() => updateDraft('SlotId', slot._id)} className="sr-only" />
                            {format.time(slot.StartsAt)}
                            <span className="sr-only">{copy.slots.durationForScreenReaders(slot.DurationMinutes)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        <FieldError id="SlotId-error" message={fieldErrors.SlotId} />
      </div>
    ),

    details: (
      <div className="space-y-3">
        {isRequestFlow && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="FullName" label={copy.request.fullName} autoComplete="name" required maxLength={120} value={draft.FullName} onChange={(event) => updateDraft('FullName', event.target.value)} error={fieldErrors.FullName} />
            <TextField name="Email" label={copy.request.email} type="email" autoComplete="email" required maxLength={254} value={draft.Email} onChange={(event) => updateDraft('Email', event.target.value)} error={fieldErrors.Email} />
          </div>
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
          <CheckboxField name="ConsentGiven" checked={hasConsented} onChange={(event) => setHasConsented(event.target.checked)} error={fieldErrors.ConsentGiven}>
            {copy.consent.before}
            <LocaleLink href="/legal/privacy" className="font-semibold text-primary-dark underline underline-offset-4">
              {copy.consent.link}
            </LocaleLink>
            {copy.consent.after}
          </CheckboxField>
        )}
        {isWhatsAppOptInEnabled && <WhatsAppOptInField checked={draft.WhatsAppOptIn} onChange={(isChecked) => updateDraft('WhatsAppOptIn', isChecked)} />}
      </div>
    ),
  };

  const isLastStep = activeStep === DETAILS_STEP;
  const submitLabel = !isLastStep ? stepCopy.continue : isRequestFlow ? copy.request.submit : session.user ? copy.submit.idle : copy.submit.signIn;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <FormSheet className="min-w-0">
        {/* Segmented progress + step heading */}
        <div aria-hidden="true" className="flex gap-1.5">
          {stepNames.map((name, index) => (
            <span key={name} className="h-1 flex-1 overflow-hidden rounded-full bg-card-dim">
              <motion.span
                initial={false}
                animate={{ scaleX: index < flow.currentStep ? 1 : 0 }}
                transition={{ duration: isReduced ? 0 : 0.35, ease: EASE_OUT_SOFT }}
                className="block h-full origin-left rounded-full bg-gradient-to-r from-primary to-primary-bright"
              />
            </span>
          ))}
        </div>
        <p ref={stepStatusRef} tabIndex={-1} className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary-dark outline-none">
          {wizardCopy.stepOf.replace('{current}', flow.currentStep).replace('{total}', stepNames.length)}
        </p>
        <p aria-live="polite" className="sr-only">
          {isAvailabilityReady ? stepCopy.stepStatus(flow.currentStep, stepNames.length, stepNames[flow.currentStep - 1]) : copy.slots.loading}
        </p>

        <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="mt-1">
          <fieldset disabled={isSubmitting} className="min-w-0">
            <AnimatePresence mode="wait" initial={false} custom={stepDirection}>
              <motion.div
                key={stepKey}
                custom={stepDirection}
                variants={isReduced ? undefined : STEP_VARIANTS}
                initial="enter"
                animate="shown"
                exit="leave"
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-3xl font-bold leading-tight text-ink">{wizardCopy.titles[stepKey]}</h2>
                  <InfoTip>{wizardCopy.subtitles[stepKey]}</InfoTip>
                </div>
                <div className="mt-4">{stepContent[stepKey]}</div>
              </motion.div>
            </AnimatePresence>

            {formError && (
              <InlineAlert tone="error" className="mt-5">
                {formError}
              </InlineAlert>
            )}

            <div className={`${STICKY_FORM_ACTIONS_CLASS} mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center`}>
              {activeStep > CHOICE_STEP && (
                <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => goToStep(flow.previousStep)}>
                  <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
                  {stepCopy.back}
                </Button>
              )}
              <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center sm:gap-4">
                {isLastStep && !isRequestFlow && session.isChecked && !session.user && <p className="text-center text-xs text-ink-muted sm:text-right">{copy.signInNote}</p>}
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !isAvailabilityReady || (activeStep === TIME_STEP && !selectedSlot) || (isLastStep && (!hasSelections || !session.isChecked))}
                  className="group w-full sm:w-auto sm:min-w-44"
                >
                  {submitLabel}
                  {!isLastStep && <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-(--dur-150) group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} />}
                </Button>
              </div>
            </div>
          </fieldset>
        </form>
      </FormSheet>

      {/* Live summary: every choice so far, the fee rule and what to prepare */}
      <aside aria-labelledby="booking-summary-title" className="hidden lg:sticky lg:top-24 lg:block">
        <div className="relative overflow-hidden rounded-panel border border-primary/25 bg-hero p-5">
          <div aria-hidden="true" className="absolute -right-12 -top-12 size-40 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.25),transparent)]" />
          <h2 id="booking-summary-title" className="relative font-heading text-2xl font-bold text-on-canvas">
            {isRequestFlow ? copy.request.title : summaryCopy.title}
          </h2>
          <dl className="relative mt-4 space-y-2.5 text-sm">
            {[
              ['type', summaryCopy.type, draft.ConsultationType ? labels.consultationType(draft.ConsultationType) : ''],
              ['mode', summaryCopy.mode, draft.Mode ? labels.consultationMode(draft.Mode) : ''],
              ['matter', wizardCopy.steps[1], draft.IntakeSubtype ? (intakeCopy.subtypes[draft.IntakeSubtype]?.label ?? '') : ''],
              ['when', summaryCopy.when, isSlotlessFlow ? copy.request.timePending : whenLabel],
            ].map(([rowKey, label, value]) => (
              <div key={rowKey} className="flex items-start justify-between gap-4">
                <dt className="text-on-canvas-subtle">{label}</dt>
                <dd className={`text-right ${value ? 'font-semibold text-on-canvas' : 'text-on-canvas-subtle'}`}>{value || summaryCopy.notSelected}</dd>
              </div>
            ))}
            <div className="flex items-start justify-between gap-4 border-t border-line-canvas pt-2.5">
              <dt className="text-on-canvas-subtle">{summaryCopy.fee}</dt>
              <dd className="text-right font-semibold text-primary-bright">{summaryCopy.feeValue}</dd>
            </div>
          </dl>
          <h3 className="relative mt-5 border-t border-line-canvas pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-on-canvas-subtle">{copy.preparation.title}</h3>
          <ul className="relative mt-2.5 space-y-2">
            {copy.preparation.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm leading-5 text-on-canvas-muted">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-bright" strokeWidth={2.5} />
                {tip}
              </li>
            ))}
          </ul>
          <LocaleLink href="/faq" className="relative mt-4 block text-sm font-semibold text-primary-bright hover:underline">
            {summaryCopy.faqLink}
          </LocaleLink>
        </div>
      </aside>
    </div>
  );
}
