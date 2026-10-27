'use client';

import { X } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef } from 'react';
import { useDictionary } from '@/brand/localeContext';

/*
  Small task-focused popup on the native <dialog> element: closes on Escape and backdrop click,
  locks page scroll while open, and hands focus to the form inside. Used where a full form would
  crowd a pinned panel (request update, file upload).
*/
export function Modal({ title, onClose, children }) {
  const dictionary = useDictionary();
  const dialogRef = useRef(null);
  const titleId = useId();
  const closeFromEscape = useEffectEvent(() => onClose());

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    if (!dialog.open) dialog.showModal();

    const handleCancel = (event) => {
      event.preventDefault();
      closeFromEscape();
    };
    dialog.addEventListener('cancel', handleCancel);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      document.body.style.overflow = previousOverflow;
      dialog.close();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-card bg-card p-0 text-left shadow-raised backdrop:bg-canvas/70 backdrop:backdrop-blur-sm motion-safe:animate-rise max-lg:m-0 max-lg:mt-auto max-lg:w-full max-lg:max-w-none max-lg:rounded-b-none"
    >
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="min-w-0 break-words text-h4 text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={dictionary.common.close}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted transition-colors duration-(--dur-150) hover:bg-card-dim hover:text-ink"
          >
            <X aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
