'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { DOCUMENT_ACCEPT_ATTRIBUTE, DOCUMENT_ALLOWED_TYPES, DOCUMENT_MAX_BYTES } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { FormMessage } from '@/components/loadState';
import { Button, Card } from '@/components/ui';
import { localizeApiError } from '@/lib/apiErrors';
import { useFormatters } from '@/lib/localeTools';
import { uploadApiFile } from '@/lib/uploadClient';
import { redirectToLogin } from '@/lib/useApiData';

export function DocumentUpload({
  endpoint = '/documents',
  requestReference = '',
  referenceOptions,
  isReferenceRequired = false,
  title,
  submitLabel,
  onUploaded,
}) {
  const dictionary = useDictionary();
  const copy = dictionary.forms.upload;
  const format = useFormatters();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const inputId = `document-file-${requestReference || 'general'}`;
  const maxSizeLabel = format.fileSize(DOCUMENT_MAX_BYTES);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileInputRef.current?.files?.[0];
    const chosenReference = referenceOptions ? new FormData(form).get('RequestReference') : requestReference;

    if (!file) {
      setMessage({ tone: 'error', text: copy.chooseFile });
      return;
    }
    if (!DOCUMENT_ALLOWED_TYPES[file.type]) {
      setMessage({ tone: 'error', text: copy.wrongType });
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setMessage({ tone: 'error', text: copy.tooLarge(maxSizeLabel) });
      return;
    }
    if (isReferenceRequired && !chosenReference) {
      setMessage({ tone: 'error', text: copy.chooseRequest });
      return;
    }

    const formData = new FormData();
    if (chosenReference) formData.append('RequestReference', chosenReference);
    formData.append('file', file);

    setIsUploading(true);
    setMessage(null);
    try {
      const data = await uploadApiFile(endpoint, formData);
      form.reset();
      setMessage({ tone: 'success', text: copy.uploaded(file.name) });
      onUploaded?.(data.document);
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card padding="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="flex items-center gap-2 text-h4 text-ink">
          <Upload aria-hidden="true" className="size-5 text-primary" strokeWidth={1.75} />
          {title ?? copy.title}
        </h3>

        {referenceOptions && (
          <div>
            <label htmlFor={`${inputId}-reference`} className="block text-sm font-semibold text-ink">
              {copy.relatedRequest}
            </label>
            <select
              id={`${inputId}-reference`}
              name="RequestReference"
              defaultValue={requestReference}
              className="mt-1.5 block w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[15px] text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100"
            >
              {!isReferenceRequired && <option value="">{copy.notLinked}</option>}
              {referenceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
            {copy.fileLabel}
          </label>
          <p id={`${inputId}-hint`} className="mt-0.5 text-sm text-ink-muted">
            {copy.fileHint(maxSizeLabel)}
          </p>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={DOCUMENT_ACCEPT_ATTRIBUTE}
            aria-describedby={`${inputId}-hint`}
            className="mt-2 block w-full rounded-xl border border-dashed border-line-strong bg-surface-alt p-3 text-sm text-ink-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:font-semibold file:text-primary-dark"
          />
        </div>

        <FormMessage message={message} />

        <Button type="submit" disabled={isUploading}>
          {isUploading ? copy.busy : (submitLabel ?? copy.submit)}
        </Button>
      </form>
    </Card>
  );
}
