'use client';

import { DOCUMENT_MAX_BYTES, getIntakeFields } from '@lexbridge/shared';
import { Check, FileText, Lock, RefreshCw, Upload, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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

const EASE_OUT_SOFT = [0.23, 1, 0.32, 1];

/*
  Three-step PDF review: choose a file (drag-and-drop or picker) → answer a few questions about it →
  upload with live progress. Signed-out visitors are sent to sign in and brought back; a browser can't
  carry the chosen file across that redirect, so they're told they'll pick it again.
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
  // Fixed subtype for every uploaded review; its fields are the "About your document" step
  const reviewFields = getIntakeFields('document-review');
  const format = useFormatters();
  const isReduced = useReducedMotion();
  const { status } = useSession();
  const fileInputRef = useRef(null);
  const isUploadingRef = useRef(false);
  const [fetchedAllowance, setFetchedAllowance] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState(null);
  const [intakeDetails, setIntakeDetails] = useState({});
  const [intakeErrors, setIntakeErrors] = useState({});
  const isSignedIn = status === 'signedIn';
  const isSignedOut = status === 'signedOut';
  const allowance = knownAllowance ?? fetchedAllowance;
  const isLimitReached = Boolean(allowance) && allowance.remaining <= 0;
  const maxSizeLabel = format.fileSize(DOCUMENT_MAX_BYTES);
  const isUploading = progress !== null;
  const activeStep = isUploading ? 2 : file ? 1 : 0;

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

  // Step 1: validate the file as soon as it's chosen, before any questions
  function chooseFile(chosenFile) {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!chosenFile || isUploadingRef.current || isLimitReached || status === 'loading') return;
    if (!isSignedIn) {
      goToSignIn();
      return;
    }
    if (chosenFile.type !== 'application/pdf' && !chosenFile.name.toLowerCase().endsWith('.pdf')) {
      setMessage({ tone: 'error', text: copy.wrongType });
      return;
    }
    if (chosenFile.size > DOCUMENT_MAX_BYTES) {
      setMessage({ tone: 'error', text: copy.tooLarge(maxSizeLabel) });
      return;
    }
    setMessage(null);
    setFile(chosenFile);
  }

  function updateDetail(fieldKey, value) {
    setIntakeDetails((current) => ({ ...current, [fieldKey]: value }));
    setIntakeErrors((current) => (current[fieldKey] ? { ...current, [fieldKey]: '' } : current));
  }

  // Steps 2 → 3: same required-field rule the API applies, then upload with progress
  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploadingRef.current) return;
    const missing = {};
    for (const field of reviewFields) {
      if (field.required && !String(intakeDetails[field.key] ?? '').trim()) missing[field.key] = intakeCopy.fieldRequired;
    }
    if (Object.keys(missing).length > 0) {
      setIntakeErrors(missing);
      setMessage({ tone: 'error', text: copy.missingDetails });
      return;
    }

    const formData = new FormData();
    formData.append('IntakeSubtype', 'document-review');
    formData.append('IntakeDetails', JSON.stringify(intakeDetails));
    formData.append('file', file);
    isUploadingRef.current = true;
    setProgress(0);
    setMessage(null);
    try {
      const { review } = await uploadApiFile('/document-reviews', formData, { onProgress: setProgress });
      router.push(toLocalized(`/dashboard/document-reviews/${review.ReferenceCode}`));
    } catch (error) {
      if (error.status === 401) {
        goToSignIn();
        return;
      }
      setMessage({ tone: 'error', text: error.status === 429 ? listCopy.limitReached : localizeApiError(error, dictionary) });
      setProgress(null);
      isUploadingRef.current = false;
    }
  }

  const percent = Math.round((progress ?? 0) * 100);
  const isDisabled = isUploading || isLimitReached;

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-panel border border-line-canvas bg-canvas-alt shadow-float">
      {/* Step indicator */}
      <ol className="flex items-center gap-2 border-b border-line-canvas px-5 py-3.5">
        {copy.steps.map((step, stepIndex) => {
          const isDone = stepIndex < activeStep;
          const isCurrent = stepIndex === activeStep;
          return (
            <li key={step} className="flex min-w-0 items-center gap-2" aria-current={isCurrent ? 'step' : undefined}>
              {stepIndex > 0 && <span aria-hidden="true" className={`h-px w-5 sm:w-8 ${isDone || isCurrent ? 'bg-primary' : 'bg-line-canvas'} transition-colors duration-(--dur-300)`} />}
              {/* Done steps are buttons: going back to step 1 picks another file */}
              <button
                type="button"
                disabled={!isDone || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex min-w-0 items-center gap-2 rounded-full enabled:cursor-pointer enabled:hover:opacity-80"
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-(--dur-300) ${isDone ? 'bg-success text-white' : isCurrent ? 'bg-cta text-canvas' : 'bg-canvas-raised text-on-canvas-subtle'}`}
                >
                  {isDone ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : stepIndex + 1}
                </span>
                <span className={`truncate text-sm font-semibold ${isCurrent ? 'text-on-canvas' : isDone ? 'text-on-canvas-muted underline-offset-4 hover:underline' : 'text-on-canvas-subtle'}`}>{step}</span>
              </button>
            </li>
          );
        })}
        <span className="ml-auto hidden h-6 items-center sm:flex">
          {isSignedOut && <Badge tone="offer">{copy.signedOutBadge}</Badge>}
          {isSignedIn && allowance && (
            <Badge tone={isLimitReached ? 'attention' : 'done'}>
              {isLimitReached ? listCopy.limitReached : listCopy.allowance(allowance.remaining, allowance.limit)}
            </Badge>
          )}
        </span>
      </ol>

      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          {!file ? (
            /* Step 1: drop zone */
            <motion.div
              key="drop"
              initial={isReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={isReduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
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
                if (!isDisabled) chooseFile(event.dataTransfer.files?.[0]);
              }}
              className={`group relative flex min-h-72 flex-col items-center justify-center overflow-hidden rounded-card border-2 border-dashed px-5 py-8 text-center transition-[border-color,background-color,box-shadow] duration-(--dur-200) ${isDragging ? 'border-primary bg-primary/10 shadow-glow' : 'border-line-canvas hover:border-primary/50'}`}
            >
              <motion.span
                animate={isDragging && !isReduced ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary-bright ring-1 ring-primary/30"
              >
                <Upload aria-hidden="true" className="size-7" strokeWidth={1.75} />
              </motion.span>
              <p className="mt-4 font-heading text-2xl font-bold text-on-canvas">{isDragging ? copy.dragActive : copy.title}</p>
              <p className="mt-1 text-sm text-on-canvas-muted">{copy.orBrowse} · {copy.hint(maxSizeLabel)}</p>
              <Button
                size="lg"
                className="mt-5 min-w-48"
                disabled={isDisabled || status === 'loading'}
                onClick={() => (isSignedIn ? fileInputRef.current?.click() : goToSignIn())}
              >
                {isSignedIn ? copy.choose : copy.signIn}
              </Button>
              {isSignedOut && <p className="mt-3 text-xs text-on-canvas-subtle">{copy.signInNote}</p>}
            </motion.div>
          ) : (
            /* Steps 2–3: chosen file, questions, upload */
            <motion.div
              key="details"
              initial={isReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={isReduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
            >
              <div className="relative flex items-center gap-3 overflow-hidden rounded-card border border-line-canvas bg-canvas-raised p-3.5">
                {/* Upload progress fills the file chip from the left */}
                {isUploading && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-full origin-left bg-primary/15 transition-transform duration-(--dur-200)"
                    style={{ transform: `scaleX(${progress})` }}
                  />
                )}
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-[#f0a0a0]">
                  <FileText aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <div className="relative min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-on-canvas">{file.name}</p>
                  <p className="tabular text-xs text-on-canvas-subtle">
                    {isUploading ? (percent >= 100 ? copy.starting : copy.uploadingPercent(percent)) : format.fileSize(file.size)}
                  </p>
                  {message?.tone === 'error' && <p role="alert" className="mt-0.5 text-xs font-medium text-[#f0a0a0]">{message.text}</p>}
                </div>
                {!isUploading && (
                  <div className="relative flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={copy.replace}
                      title={copy.replace}
                      className="flex size-9 items-center justify-center rounded-full text-on-canvas-muted transition-colors duration-(--dur-150) hover:bg-canvas-alt hover:text-on-canvas active:scale-(--press-scale)"
                    >
                      <RefreshCw aria-hidden="true" className="size-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setMessage(null);
                      }}
                      aria-label={copy.remove}
                      title={copy.remove}
                      className="flex size-9 items-center justify-center rounded-full text-on-canvas-muted transition-colors duration-(--dur-150) hover:bg-danger/15 hover:text-[#f0a0a0] active:scale-(--press-scale)"
                    >
                      <X aria-hidden="true" className="size-4" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>

              {/* Light sheet for the questions: the shared form fields are built for light surfaces */}
              <fieldset disabled={isUploading} className="mt-4 rounded-card bg-card p-4 sm:p-5">
                <legend className="sr-only">{copy.aboutTitle}</legend>
                <p className="text-h4 text-ink">{copy.aboutTitle}</p>
                <div className="stagger mt-3 grid gap-3">
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
                          onChange={(event) => updateDetail(field.key, event.target.value)}
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
                        onChange={(event) => updateDetail(field.key, event.target.value)}
                      />
                    );
                  })}
                </div>
                <Button type="submit" size="lg" isFullWidth isLoading={isUploading} disabled={isLimitReached} className="mt-5">
                  {copy.submit}
                </Button>
              </fieldset>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          aria-label={copy.choose}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        {message && !(file && message.tone === 'error') && (
          <div className="mt-3">
            <FormMessage message={message} />
          </div>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-on-canvas-subtle">
          <Lock aria-hidden="true" className="size-3.5" strokeWidth={2} />
          {copy.trust(BRAND.documentReviewRetentionDays)}
        </p>
      </div>
    </form>
  );
}
