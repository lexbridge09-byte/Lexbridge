'use client';

import { useDictionary } from '@/brand/localeContext';
import { Button, ButtonLink, Section } from '@/components/ui';

// Error boundaries must be client components. Next.js 16.2+ passes `retry`; older versions pass `reset`.
export default function Error({ retry, reset }) {
  const copy = useDictionary().common.error;
  const handleRetry = retry ?? reset;
  return (
    <Section>
      <div role="alert" className="mx-auto max-w-xl py-8 text-center">
        <h1 className="text-h2 text-ink">{copy.title}</h1>
        <p className="mt-3 leading-7 text-ink-muted">{copy.body}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {handleRetry && <Button onClick={() => handleRetry()}>{copy.retry}</Button>}
          <ButtonLink href="/" variant="secondary">
            {copy.home}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
