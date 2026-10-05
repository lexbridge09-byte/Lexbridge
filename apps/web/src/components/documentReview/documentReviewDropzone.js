'use client';

import { DOCUMENT_MAX_BYTES, getIntakeFields } from '@lexbridge/shared';
import { Lock, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BRAND } from '@/brand/brandConfig';
import { useDictionary, useLocale, useLocalizedHref } from '@/brand/localeContext';
import { SelectField, TextField } from '@/components/formFields';
import { FormMessage } from '@/components/loadState';
import { Badge, Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useFormatters } from '@/lib/localeTools';
import { deriveLoginHref } from '@/lib/safeRedirect';
import { useSession } from '@/lib/session';
import { uploadApiFile } from '@/lib/uploadClient';

/*
  Drag-and-drop PDF upload. Signed-out visitors are sent to sign in and brought back to this page;
  a browser can't carry the chosen file across that redirect, so they are told they'll pick it again.
  Pass `allowance` when the page has already loaded it.
*/
export function DocumentReviewDropzone({ allowance: knownAllowance }) {
  const router = useRouter();
  const locale = useLocale();
  const toLocalized = useLocalizedHref();
  const dictionary = useDictionary();
  const copy = dictionary.documentReview.dropzone;
  const listCopy = dictionary.documentReview.list;
  const intakeCopy = dictionary.intake;
  // Fixed subtype for every uploaded review; its fields are the "About your document" block
  const reviewFields = getIntakeFields('document-review');
  const format = useFormatters();
  const { status } = useSession();
  const fileInputRef = useRef(null);
  const [fetchedAllowance, setFetchedAllowance] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [intakeDetails, setIntakeDetails] = useState({});
  const [intakeErrors, setIntakeErrors] = useState({});
  const isSignedIn = status === 'signedIn';
  const isSignedOut = status === 'signedOut';
  const allowance = knownAllowance ?? fetchedAllowance;
  const isLimitReached = Boolean(allowance) && allowance.remaining <= 0;
  const maxSizeLabel = format.fileSize(DOCUMENT_MAX_BYTES);

  useEffect(() => {
    if (!isSignedIn || knownAllowance) return undefined;
    let isCancelled = false;
    requestApi('/document-reviews/mine')
      .then((data) => {
        if (!isCancelled) setFetchedAllowance(data.allowance);
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [isSignedIn, knownAllowance]);

  function goToSignIn() {
    window.location.assign(deriveLoginHref(`${window.location.pathname}${window.location.search}`, locale));
  }

  async function handleFile(file) {
    if (!file) return;
    if (!isSignedIn) {
      goToSignIn();
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setMessage({ tone: 'error', text: copy.wrongType });
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setMessage({ tone: 'error', text: copy.tooLarge(maxSizeLabel) });
      return;
    }

    // Same required-field rule the API applies; caught here so the file isn't rejected after upload
    const missing = {};
    for (const field of reviewFields) {
      if (field.required && !String(intakeDetails[field.key] ?? '').trim()) {
        missing[field.key] = intakeCopy.fieldRequired;
      }
    }
    if (Object.keys(missing).length > 0) {
      setIntakeErrors(missing);
      setMessage({ tone: 'error', text: listCopy.missingDetails ?? intakeCopy.fieldRequired });
      return;
    }
    setIntakeErrors({});

    const formData = new FormData();
    formData.append('file', file);
    formData.append('IntakeSubtype', 'document-review');
    formData.append('IntakeDetails', JSON.stringify(intakeDetails));
    setIsUploading(true);
    setMessage(null);
    try {
      const { review } = await uploadApiFile('/document-reviews', formData);
      router.push(toLocalized(`/dashboard/document-reviews/${review.ReferenceCode}`));
    } catch (error) {
      if (error.status === 401) {
        goToSignIn();
        return;
      }
      setMessage({ tone: 'error', text: error.status === 429 ? listCopy.limitReached : localizeApiError(error, dictionary) });
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const isDisabled = isUploading || isLimitReached;

  return (
    <div className="rounded-panel border border-line bg-card p-3 shadow-soft sm:p-4">
      {/* Context for the reviewer: which document it is and how urgent — feeds the assignment desk */}
      <fieldset className="mb-4 motion-safe:animate-rise rounded-xl border border-line bg-card-dim/60 p-4">
        <legend className="px-1 text-xs font-semibold text-ink-muted">{copy.aboutTitle}</legend>
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {reviewFields.map((field) => {
            const label = intakeCopy.fields[field.key]?.label ?? field.key;
            if (field.type === 'select') {
              const options = (field.options ?? []).map((optionKey) => ({ value: optionKey, label: intakeCopy.options[optionKey] ?? optionKey }));
              return (
                <SelectField
                  key={field.key}
                  label={label}
                  name={`DocDetail.${field.key}`}
                  options={options}
                  placeholder={intakeCopy.choose}
                  required={field.required}
                  error={intakeErrors[field.key]}
                  value={intakeDetails[field.key] ?? ''}
                  onChange={(event) => {
                    setIntakeDetails((current) => ({ ...current, [field.key]: event.target.value }));
                    setIntakeErrors((current) => (current[field.key] ? { ...current, [field.key]: '' } : current));
                  }}
                />
              );
            }
            return (
              <TextField
                key={field.key}
                label={label}
                name={`DocDetail.${field.key}`}
                type={field.type === 'date' ? 'date' : 'text'}
                required={field.required}
                error={intakeErrors[field.key]}
                value={intakeDetails[field.key] ?? ''}
                onChange={(event) => {
                  setIntakeDetails((current) => ({ ...current, [field.key]: event.target.value }));
                  setIntakeErrors((current) => (current[field.key] ? { ...current, [field.key]: '' } : current));
                }}
              />
            );
          })}
        </div>
      </fieldset>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isDisabled) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!isDisabled) handleFile(event.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-64 flex-col items-center justify-center rounded-card border-2 border-dashed px-5 py-7 text-center transition-[border-color,background-color,box-shadow] duration-(--dur-200) ease-(--ease-out-soft) motion-reduce:transition-none ${isDragging ? 'border-primary bg-primary-50 shadow-glow' : 'border-primary-100 bg-card-dim/70 hover:border-primary/50'}`}
      >
        <div className="flex h-6 items-center">
          {isSignedOut && <Badge tone="offer">{copy.signedOutBadge}</Badge>}
          {isSignedIn && allowance && (
            <Badge tone={isLimitReached ? 'attention' : 'done'}>
              {isLimitReached ? listCopy.limitReached : listCopy.allowance(allowance.remaining, allowance.limit)}
            </Badge>
          )}
        </div>
        <span className="mt-4 flex size-14 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-line">
          <Upload aria-hidden="true" className="size-7" strokeWidth={1.75} />
        </span>
        <p className="mt-3 font-display text-lg font-semibold text-ink">{isDragging ? copy.dragActive : copy.title}</p>
        <p className="text-sm text-ink-muted">{copy.hint(maxSizeLabel)}</p>
        <Button
          size="lg"
          className="mt-4 min-w-48"
          disabled={isDisabled || status === 'loading'}
          onClick={() => (isSignedIn ? fileInputRef.current?.click() : goToSignIn())}
        >
          {isUploading ? copy.busy : isSignedIn ? copy.choose : copy.signIn}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          aria-label={copy.choose}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        {message && (
          <div className="mt-3 w-full max-w-sm text-left">
            <FormMessage message={message} />
          </div>
        )}
      </div>
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <Lock aria-hidden="true" className="size-3.5" strokeWidth={2} />
        {copy.trust(BRAND.documentReviewRetentionDays)}
      </p>
      {isSignedOut && <p className="mt-0.5 text-center text-xs text-ink-muted">{copy.signInNote}</p>}
    </div>
  );
}
