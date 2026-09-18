'use client';

import { DOCUMENT_MAX_BYTES } from '@lexbridge/shared';
import { Lock, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BRAND } from '@/brand/brandConfig';
import { useDictionary, useLocale, useLocalizedHref } from '@/brand/localeContext';
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
  const format = useFormatters();
  const { status } = useSession();
  const fileInputRef = useRef(null);
  const [fetchedAllowance, setFetchedAllowance] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);
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

    const formData = new FormData();
    formData.append('file', file);
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
    <div className="rounded-panel border border-line bg-white p-3 shadow-soft sm:p-4">
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
        className={`flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${isDragging ? 'border-primary bg-primary-50' : 'border-primary-100 bg-surface-alt/70'}`}
      >
        <div className="flex h-6 items-center">
          {isSignedOut && <Badge tone="offer">{copy.signedOutBadge}</Badge>}
          {isSignedIn && allowance && (
            <Badge tone={isLimitReached ? 'attention' : 'done'}>
              {isLimitReached ? listCopy.limitReached : listCopy.allowance(allowance.remaining, allowance.limit)}
            </Badge>
          )}
        </div>
        <span className="mt-4 flex size-14 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-line">
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
