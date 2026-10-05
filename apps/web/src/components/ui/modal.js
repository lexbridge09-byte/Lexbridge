'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useDictionary } from '@/brand/localeContext';

/*
  Small task-focused popup on the native <dialog> element: closes on Escape and backdrop click,
  locks page scroll while open, and hands focus to the form inside. Used where a full form would
  crowd a pinned panel (request update, file upload).
*/
export function Modal({ title, onClose, children }) {
  const dictionary = useDictionary();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();

    const handleCancel = (event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      document.body.style.overflow = previousOverflow;
      dialog.close();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-card bg-card p-0 text-left shadow-raised backdrop:bg-canvas/70 backdrop:backdrop-blur-sm motion-safe:animate-rise max-lg:m-0 max-lg:mt-auto max-lg:w-full max-lg:max-w-none max-lg:rounded-b-none"
    >
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-h4 text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={dictionary.common.close}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-control text-ink-muted transition-colors duration-(--dur-150) hover:bg-card-dim hover:text-ink"
          >
            <X aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
