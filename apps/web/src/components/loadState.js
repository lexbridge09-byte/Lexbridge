'use client';

import { useDictionary } from '@/brand/localeContext';
import { Button, ButtonLink, InlineAlert, SkeletonList } from '@/components/ui';
import { localizeApiError } from '@/lib/apiErrors';

export function LoadingNote({ label, rows = 3 }) {
  const loadingLabel = useDictionary().common.states.loading;
  return <SkeletonList label={label ?? loadingLabel} rows={rows} />;
}

export function AccessNotice() {
  const copy = useDictionary().admin.accessNotice;
  return (
    <InlineAlert tone="info" title={copy.title}>
      <p>{copy.body}</p>
      <ButtonLink href="/dashboard" variant="link" className="mt-2">
        {copy.cta}
      </ButtonLink>
    </InlineAlert>
  );
}

export function ErrorNote({ error, onRetry }) {
  const dictionary = useDictionary();
  if (error?.status === 403) return <AccessNotice />;
  return (
    <InlineAlert tone="error">
      <p>{localizeApiError(error, dictionary)}</p>
      {onRetry && (
        <Button variant="link" onClick={onRetry} className="mt-1">
          {dictionary.common.states.tryAgain}
        </Button>
      )}
    </InlineAlert>
  );
}

export function FormMessage({ message }) {
  if (!message) return null;
  const isError = message.tone === 'error';
  return (
    <InlineAlert tone={isError ? 'error' : 'success'} role={isError ? 'alert' : 'status'}>
      {message.text}
    </InlineAlert>
  );
}
