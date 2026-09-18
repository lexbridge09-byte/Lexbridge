'use client';

import { CALLBACK_TIME_WINDOW_KEYS } from '@lexbridge/shared';
import { Phone, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useDictionary, useLocale } from '@/brand/localeContext';
import { CheckboxField, SelectField, TextField } from '@/components/formFields';
import { LocaleLink } from '@/components/localeLink';
import { Button, InlineAlert } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useCatalogLabels } from '@/lib/localeTools';

const TRIGGER_CLASSES = {
  // Always icon-only in the header so it can never wrap; the label is announced and shown as a tooltip
  header: 'flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-alt',
  icon: 'flex size-9 shrink-0 items-center justify-center rounded-xl border border-line text-primary hover:bg-primary-50',
  block:
    'flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 font-semibold text-ink hover:border-primary-100 hover:bg-primary-50',
};

const CHIP_CLASS =
  'cursor-pointer rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:border-line-strong has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:text-primary-dark has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary';

function CallbackForm({ idPrefix, onDone }) {
  const dictionary = useDictionary();
  const copy = dictionary.callback;
  const locale = useLocale();
  const labels = useCatalogLabels();
  const [isBusy, setIsBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);

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
      const data = await requestApi('/callbacks', {
        method: 'POST',
        body: {
          FullName: String(formData.get('FullName') ?? '').trim(),
          Phone: String(formData.get('Phone') ?? '').trim(),
          PreferredLanguage: formData.get('PreferredLanguage'),
          PreferredTime: formData.get('PreferredTime'),
          Topic: String(formData.get('Topic') ?? '').trim(),
          ConsentGiven: true,
        },
      });
      setResult(data);
    } catch (error) {
      setFieldErrors(localizeFieldErrors(error, dictionary));
      setFormError(localizeApiError(error, dictionary));
    } finally {
      setIsBusy(false);
    }
  }

  if (result) {
    const referenceCode = result.callback.ReferenceCode;
    return (
      <div role="status">
        <InlineAlert tone="success" title={copy.successTitle}>
          {result.isDuplicate ? copy.duplicate(referenceCode) : copy.success(referenceCode)}
        </InlineAlert>
        <Button onClick={onDone} isFullWidth className="mt-4">
          {copy.done}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id={`${idPrefix}-name`} label={copy.fullName} name="FullName" autoComplete="name" required error={fieldErrors.FullName} />
        <TextField
          id={`${idPrefix}-phone`}
          label={copy.phone}
          name="Phone"
          type="tel"
          autoComplete="tel"
          placeholder={copy.phonePlaceholder}
          required
          error={fieldErrors.Phone}
        />
      </div>
      <SelectField
        id={`${idPrefix}-language`}
        label={copy.languageLabel}
        name="PreferredLanguage"
        options={labels.languageOptions}
        defaultValue={locale}
      />
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{copy.timeLabel}</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {CALLBACK_TIME_WINDOW_KEYS.map((windowKey, windowIndex) => (
            <label key={windowKey} className={CHIP_CLASS}>
              <input type="radio" name="PreferredTime" value={windowKey} defaultChecked={windowIndex === 0} className="sr-only" />
              {labels.callbackTimeWindow(windowKey)}
            </label>
          ))}
        </div>
      </fieldset>
      <TextField
        id={`${idPrefix}-topic`}
        label={copy.topicLabel}
        name="Topic"
        maxLength={500}
        placeholder={copy.topicPlaceholder}
        error={fieldErrors.Topic}
      />
      <CheckboxField id={`${idPrefix}-consent`} name="ConsentGiven" error={fieldErrors.ConsentGiven}>
        {copy.consentBefore}
        <LocaleLink href="/legal/privacy" className="font-semibold text-primary underline underline-offset-4">
          {copy.consentLink}
        </LocaleLink>
        {copy.consentAfter}
      </CheckboxField>
      {formError && Object.keys(fieldErrors).length === 0 && <InlineAlert tone="error">{formError}</InlineAlert>}
      <Button type="submit" disabled={isBusy} isFullWidth>
        {isBusy ? copy.busy : copy.submit}
      </Button>
    </form>
  );
}

// "Call me back" trigger with its own sheet (bottom sheet on phones, centred dialog on larger screens)
export function CallbackRequestButton({ variant = 'block', label, className = '' }) {
  const copy = useDictionary().callback;
  const dialogRef = useRef(null);
  const idPrefix = useId().replace(/:/g, '');
  const [isOpen, setIsOpen] = useState(false);
  const titleId = `${idPrefix}-title`;

  function openSheet() {
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function closeSheet() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" onClick={openSheet} aria-haspopup="dialog" title={variant === 'block' ? undefined : copy.trigger} className={`${TRIGGER_CLASSES[variant] ?? TRIGGER_CLASSES.block} ${className}`}>
        <Phone aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
        {variant === 'icon' ? <span className="sr-only">{copy.trigger}</span> : null}
        {variant === 'header' ? <span className="sr-only">{copy.trigger}</span> : null}
        {variant === 'block' ? <span>{label ?? copy.trigger}</span> : null}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeSheet();
        }}
        className="mx-auto mb-0 mt-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-0 text-ink shadow-float backdrop:bg-ink/55 sm:mb-auto sm:rounded-3xl"
      >
        {isOpen && (
          <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-h4 text-ink">
                  {copy.title}
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">{copy.body}</p>
              </div>
              <button type="button" onClick={closeSheet} className="-mr-2 -mt-1 flex size-10 items-center justify-center rounded-full hover:bg-surface-alt">
                <X aria-hidden="true" className="size-5" strokeWidth={2} />
                <span className="sr-only">{copy.close}</span>
              </button>
            </div>
            <CallbackForm idPrefix={idPrefix} onDone={closeSheet} />
          </div>
        )}
      </dialog>
    </>
  );
}
