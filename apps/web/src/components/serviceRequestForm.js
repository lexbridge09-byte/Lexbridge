'use client';

import { ArrowLeft } from 'lucide-react';
import { getIntakeFields, getIntakeSubtypes } from '@lexbridge/shared';
import { createElement, useRef, useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { CheckboxField, FieldError, SelectField, TextAreaField, TextField } from '@/components/formFields';
import { LocaleLink } from '@/components/localeLink';
import { Button, InlineAlert, StepIndicator } from '@/components/ui';
import { WhatsAppOptInField } from '@/components/whatsAppOptInField';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { getIcon } from '@/lib/icons';
import { useCatalogLabels } from '@/lib/localeTools';
import { useIsFeatureEnabled } from '@/components/featuresProvider';

const MATTER_STEP = 1;
const DETAILS_STEP = 2;
const MATTER_FIELDS = ['ServiceCategory', 'Subtype', 'Description'];
// Matches the API rule in serviceRequests.routes.js, so step one never passes what the server rejects
const DESCRIPTION_MIN_LENGTH = 20;

// Gathers the conditional intake answers for the chosen subtype into the API's flat object
function collectIntakeDetails(formData, subtypeKey) {
  const details = {};
  for (const field of getIntakeFields(subtypeKey) ?? []) {
    const value = String(formData.get(`IntakeDetails.${field.key}`) ?? '').trim();
    if (value) details[field.key] = value.slice(0, field.maxLength ?? 300);
  }
  return details;
}

const TILE_CLASS =
  'flex h-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 transition-colors duration-(--dur-150) hover:border-line-strong has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';

// Subtype choices render as compact chips (Hick's law: few, scannable options); icons optional
const SUBTYPE_CHIP_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center rounded-control border px-3.5 py-2 text-sm font-semibold transition-colors duration-(--dur-150) has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:text-primary-dark hover:border-primary-100 border-line bg-card text-ink';

function SubtypePicker({ label, options, error, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={SUBTYPE_CHIP_CLASS}>
            <input type="radio" name="Subtype" value={option.value} onChange={onChange} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id="Subtype-error" message={error} />
    </fieldset>
  );
}

// Conditional subtype-specific questions, revealed only after a subtype is chosen
function IntakeDetailsFields({ subtypeKey, error }) {
  const intake = useDictionary().intake;
  const fields = getIntakeFields(subtypeKey) ?? [];
  if (fields.length === 0) return null;
  return (
    <fieldset key={subtypeKey} className="motion-safe:animate-rise rounded-xl border border-line bg-card-dim/60 p-4">
      <legend className="px-1 text-xs font-semibold text-ink-muted">{intake.detailsTitle}</legend>
      <div className="stagger grid gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const name = `IntakeDetails.${field.key}`;
          const label = intake.fields[field.key]?.label ?? field.key;
          if (field.type === 'select') {
            const options = (field.options ?? []).map((optionKey) => ({ value: optionKey, label: intake.options[optionKey] ?? optionKey }));
            return <SelectField key={field.key} label={label} name={name} options={options} placeholder={intake.choose} required={field.required} error={error?.[name]} />;
          }
          if (field.type === 'date') {
            return <TextField key={field.key} label={label} name={name} type="date" required={field.required} error={error?.[name]} />;
          }
          return <TextField key={field.key} label={label} name={name} type="text" maxLength={field.maxLength ?? 300} required={field.required} error={error?.[name]} />;
        })}
      </div>
    </fieldset>
  );
}

/*
  Two short steps instead of one long form: what the matter is, then how to reach you.
  Both steps stay mounted so values survive Back, and a server error returns to the step that holds it.
  subtypeOptions: [{ value, label, description?, icon? }]
*/
export function ServiceRequestForm({
  source = 'contact-form',
  defaultCategory = '',
  isCategoryLocked = false,
  subtypeLabel,
  subtypeOptions,
  initialDescription = '',
  descriptionLabel,
  submitLabel,
}) {
  const dictionary = useDictionary();
  const isAccountsEnabled = useIsFeatureEnabled('clientAccounts');
  const isWhatsAppOptInEnabled = useIsFeatureEnabled('whatsAppNotifications');
  const copy = dictionary.forms.serviceRequest;
  const labels = useCatalogLabels();
  const formRef = useRef(null);
  const stepStatusRef = useRef(null);
  // A matter already described elsewhere (e.g. the solution finder) skips straight to contact details
  const [step, setStep] = useState(() => (initialDescription && (isCategoryLocked || defaultCategory) ? DETAILS_STEP : MATTER_STEP));
  const [stepDirection, setStepDirection] = useState('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [matterCategory, setMatterCategory] = useState(defaultCategory);
  const [subtypeKey, setSubtypeKey] = useState('');
  const stepNames = [copy.stepMatter, copy.stepDetails];
  const intakeCopy = dictionary.intake;

  // Subtype chips: page-provided options win (drafting), otherwise the intake catalog for the category
  const catalogSubtypeKeys = getIntakeSubtypes(isCategoryLocked || !subtypeOptions ? matterCategory : '');
  const effectiveSubtypeOptions = subtypeOptions ?? [
    ...catalogSubtypeKeys.map((key) => ({ value: key, label: intakeCopy.subtypes[key]?.label ?? key })),
    { value: 'other', label: intakeCopy.otherLabel },
  ];
  const showIntake = Boolean(subtypeKey && subtypeKey !== 'other' && getIntakeFields(subtypeKey));

  function goToStep(nextStep, fieldToFocus) {
    setStepDirection(nextStep >= step ? 'forward' : 'back');
    setStep(nextStep);
    // Focus after the step becomes visible: the first invalid field, otherwise the step announcement
    requestAnimationFrame(() => {
      const target = fieldToFocus ? formRef.current?.elements.namedItem(fieldToFocus) : stepStatusRef.current;
      (target instanceof RadioNodeList ? target[0] : target)?.focus();
    });
  }

  function validateMatter() {
    const formData = new FormData(formRef.current);
    const errors = {};
    if (!isCategoryLocked && !formData.get('ServiceCategory')) errors.ServiceCategory = copy.stepErrors.service;
    if (String(formData.get('Description') ?? '').trim().length < DESCRIPTION_MIN_LENGTH) errors.Description = copy.stepErrors.description;
    // Required intake questions for the chosen subtype
    for (const field of getIntakeFields(subtypeKey) ?? []) {
      if (field.required && !String(formData.get(`IntakeDetails.${field.key}`) ?? '').trim()) {
        errors[`IntakeDetails.${field.key}`] = intakeCopy.fieldRequired;
      }
    }
    return errors;
  }

  function continueToDetails() {
    const errors = validateMatter();
    setFieldErrors(errors);
    const firstInvalid = MATTER_FIELDS.find((field) => errors[field]);
    if (firstInvalid) {
      formRef.current?.elements.namedItem(firstInvalid)?.focus?.();
      return;
    }
    goToStep(DETAILS_STEP);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // Enter inside step one moves forward rather than submitting half a form
    if (step === MATTER_STEP) {
      continueToDetails();
      return;
    }
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError('');

    try {
      const data = await requestApi('/service-requests', {
        method: 'POST',
        body: {
          FullName: formData.get('FullName'),
          Email: formData.get('Email'),
          Phone: formData.get('Phone'),
          ServiceCategory: isCategoryLocked ? defaultCategory : formData.get('ServiceCategory'),
          Subtype: formData.get('Subtype') ?? '',
          IntakeDetails: collectIntakeDetails(formData, subtypeKey),
          Description: formData.get('Description'),
          Source: source,
          ConsentGiven: formData.get('ConsentGiven') === 'on',
          WhatsAppOptIn: formData.get('WhatsAppOptIn') === 'on',
        },
      });
      setReferenceCode(data.ReferenceCode);
    } catch (error) {
      const errors = localizeFieldErrors(error, dictionary);
      setFieldErrors(errors);
      setFormError(localizeApiError(error, dictionary));
      const matterError = MATTER_FIELDS.find((field) => errors[field]);
      if (matterError) goToStep(MATTER_STEP, matterError);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (referenceCode) {
    return (
      <InlineAlert tone="success" title={copy.successTitle} role="status">
        <p>
          {copy.successReferenceBefore}
          <strong className="font-semibold tracking-wide">{referenceCode}</strong>
          {copy.successReferenceAfter}
        </p>

        {/* The reference is the only way a guest can track the request later, so it gets its own block */}
        <div className="mt-3 rounded-xl bg-card-dim p-4">
          <p className="text-sm font-semibold text-ink">{copy.successCodeLabel}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-card px-3 py-1.5 font-mono text-base font-bold tracking-widest text-ink ring-1 ring-line">
              {referenceCode}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(referenceCode);
                setHasCopiedCode(true);
              }}
            >
              {hasCopiedCode ? copy.copied : copy.copyCode}
            </Button>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-muted">{copy.successTrackNote}</p>
        </div>

        <p className="mt-2 text-ink-muted">
          {isAccountsEnabled ? (
            <>
              {copy.successNextBefore}
              <LocaleLink href="/login" className="font-semibold text-primary underline underline-offset-4">
                {copy.successNextLink}
              </LocaleLink>
              {copy.successNextAfter}
            </>
          ) : (
            copy.successNextNoAccounts
          )}
        </p>
      </InlineAlert>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <StepIndicator label={copy.stepsLabel} steps={stepNames} current={step} className="mb-4" />
      <p ref={stepStatusRef} tabIndex={-1} aria-live="polite" className="sr-only">
        {copy.stepStatus(step, stepNames.length, stepNames[step - 1])}
      </p>

      <div hidden={step !== MATTER_STEP} className={`space-y-4 motion-safe:${stepDirection === 'back' ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}>
        {!isCategoryLocked && (
          <SelectField
            label={copy.service}
            name="ServiceCategory"
            options={labels.serviceOptions}
            placeholder={copy.servicePlaceholder}
            defaultValue={defaultCategory}
            required
            error={fieldErrors.ServiceCategory}
            onChange={(event) => {
              setMatterCategory(event.target.value);
              setSubtypeKey('');
            }}
          />
        )}
        {(subtypeOptions || catalogSubtypeKeys.length > 0) && (
          <div>
            <SubtypePicker
              label={subtypeLabel ?? intakeCopy.subtypeLabel}
              options={effectiveSubtypeOptions}
              error={fieldErrors.Subtype}
              onChange={(event) => setSubtypeKey(event.target.value)}
            />
            {showIntake && <IntakeDetailsFields subtypeKey={subtypeKey} error={fieldErrors} />}
          </div>
        )}
        <TextAreaField
          label={descriptionLabel ?? copy.descriptionLabel}
          name="Description"
          rows={4}
          maxLength={5000}
          defaultValue={initialDescription}
          placeholder={copy.descriptionPlaceholder}
          hint={copy.descriptionHint}
          required
          error={fieldErrors.Description}
        />
        <Button onClick={continueToDetails} className="w-full sm:w-auto sm:min-w-40">
          {copy.continue}
        </Button>
      </div>

      <div hidden={step !== DETAILS_STEP} className={`space-y-4 motion-safe:${stepDirection === 'back' ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}>
        <TextField label={copy.fullName} name="FullName" autoComplete="name" required error={fieldErrors.FullName} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={copy.email} name="Email" type="email" autoComplete="email" required error={fieldErrors.Email} />
          <TextField
            label={copy.phone}
            name="Phone"
            type="tel"
            autoComplete="tel"
            placeholder={copy.phonePlaceholder}
            required
            error={fieldErrors.Phone}
          />
        </div>

        <CheckboxField name="ConsentGiven" error={fieldErrors.ConsentGiven}>
          {copy.consentBefore}
          <LocaleLink href="/legal/privacy" className="font-semibold text-primary underline underline-offset-4">
            {copy.consentLink}
          </LocaleLink>
          {copy.consentAfter}
        </CheckboxField>

        {isWhatsAppOptInEnabled && <WhatsAppOptInField />}

        {formError && Object.keys(fieldErrors).length === 0 && <InlineAlert tone="error">{formError}</InlineAlert>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Button variant="ghost" onClick={() => goToStep(MATTER_STEP)} className="sm:mr-auto">
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
            {copy.back}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto sm:min-w-40">
            {isSubmitting ? copy.submitting : (submitLabel ?? copy.submit)}
          </Button>
        </div>
      </div>
    </form>
  );
}
