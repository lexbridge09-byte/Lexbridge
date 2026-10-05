'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDictionary } from '@/brand/localeContext';

/*
  Reference code with a one-tap copy button, used wherever a code is a page's primary identity
  (admin/team detail headings, client request/order/consultation details). The code itself stays
  selectable text; the button copies the plain code and confirms with a short check state.
*/
export function ReferenceCodeTag({ code, size = 'md', className = '' }) {
  const dictionary = useDictionary();
  const copyLabel = dictionary.common.copy;
  const copiedLabel = dictionary.common.copied;
  const [hasCopied, setHasCopied] = useState(false);
  const resetTimer = useRef(null);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setHasCopied(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setHasCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context): the code stays selectable text
    }
  }

  const textSize = size === 'lg' ? 'text-lg' : 'text-sm';
  return (
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      <code className={`truncate rounded-lg bg-card-dim px-2.5 py-1 font-mono font-bold tracking-widest text-ink ${textSize}`}>{code}</code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`${copyLabel} ${code}`}
        title={copyLabel}
        className={`inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control border border-line bg-card text-ink-muted transition-colors duration-(--dur-150) hover:border-primary hover:text-primary-dark ${hasCopied ? 'border-success text-success' : ''}`}
      >
        {hasCopied ? (
          <Check aria-hidden="true" className="size-4" strokeWidth={2.25} />
        ) : (
          <Copy aria-hidden="true" className="size-4" strokeWidth={1.75} />
        )}
      </button>
      {hasCopied && <span className="text-xs font-semibold text-success">{copiedLabel}</span>}
    </span>
  );
}
