'use client';

import { ArrowLeft } from 'lucide-react';
import { createElement, useRef, useState } from 'react';
import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { CheckboxField, FieldError, SelectField, TextAreaField, TextField } from '@/components/formFields';
import { LocaleLink } from '@/components/localeLink';
import { Button, InlineAlert, StepIndicator } from '@/components/ui';
import { WhatsAppOptInField } from '@/components/whatsAppOptInField';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { getIcon } from '@/lib/icons';
import { useCatalogLabels } from '@/lib/localeTools';

const MATTER_STEP = 1;
const DETAILS_STEP = 2;
const MATTER_FIELDS = ['ServiceCategory', 'Subtype', 'Description'];
// Matches the API rule in serviceRequests.routes.js, so step one never passes what the server rejects
const DESCRIPTION_MIN_LENGTH = 20;

const TILE_CLASS =
  'flex h-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 transition-colors duration-(--dur-150) hover:border-line-strong has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';

// Document types with icons render as tiles (one tap); plain lists stay a select
function SubtypePicker({ label, options, placeholder, error }) {
  if (!options.some((option) => option.icon)) {
    return <SelectField label={label} name="Subtype" options={options} placeholder={placeholder} error={error} />;
  }
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className={TILE_CLASS}>
            <input type="radio" name="Subtype" value={option.value} className="sr-only" />
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
              {createElement(getIcon(option.icon), { 'aria-hidden': true, className: 'size-[18px]', strokeWidth: 1.75 })}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{option.label}</span>
              {option.description && <span className="block truncate text-xs text-ink-muted">{option.description}</span>}
            </span>
          </label>
        ))}
      </div>
      <FieldError id="Subtype-error" message={error} />
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
  const copy = dictionary.forms.serviceRequest;
  const labels = useCatalogLabels();
  const formRef = useRef(null);
  const stepStatusRef = useRef(null);
  // A matter already described elsewhere (e.g. the solution finder) skips straight to contact details
  const [step, setStep] = useState(() => (initialDescription && (isCategoryLocked || defaultCategory) ? DETAILS_STEP : MATTER_STEP));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const stepNames = [copy.stepMatter, copy.stepDetails];

  function goToStep(nextStep, fieldToFocus) {
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
        <p className="mt-2 text-ink-muted">
          {isFeatureEnabled('clientAccounts') ? (
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

      <div hidden={step !== MATTER_STEP} className="space-y-4 motion-safe:animate-fade-in">
        {!isCategoryLocked && (
          <SelectField
            label={copy.service}
            name="ServiceCategory"
            options={labels.serviceOptions}
            placeholder={copy.servicePlaceholder}
            defaultValue={defaultCategory}
            required
            error={fieldErrors.ServiceCategory}
          />
        )}
        {subtypeOptions && (
          <SubtypePicker label={subtypeLabel} options={subtypeOptions} placeholder={copy.subtypePlaceholder} error={fieldErrors.Subtype} />
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

      <div hidden={step !== DETAILS_STEP} className="space-y-4 motion-safe:animate-fade-in">
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

        {isFeatureEnabled('whatsAppNotifications') && <WhatsAppOptInField />}

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
