'use client';

import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const EASE_OUT_SOFT = [0.23, 1, 0.32, 1];

/*
  Right-hand panel for previewing a row without leaving the list (master–detail). Full screen on
  phones. Esc or the backdrop closes it; focus moves into the panel and returns to the opener.
*/
export function SideSheet({ isOpen, onClose, title, closeLabel, actions, footer, width = 'max-w-xl', children }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const isReduced = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;
    openerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => panelRef.current?.focus());
    // An Esc already handled inside the sheet (e.g. closing a dropdown) must not close the sheet too
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      openerRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={isReduced ? { opacity: 0 } : { x: '100%' }}
            animate={isReduced ? { opacity: 1 } : { x: 0 }}
            exit={isReduced ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: 0.3, ease: EASE_OUT_SOFT }}
            className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col bg-card text-ink shadow-float outline-none`}
          >
            <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <h2 className="min-w-0 flex-1 truncate font-heading text-2xl font-bold">{title}</h2>
              {actions}
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--dur-150) hover:bg-card-dim hover:text-ink active:scale-(--press-scale)"
              >
                <X aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
            </header>
            <div className="scroll-soft min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
            {/* Pinned actions: always in reach however long the content is */}
            {footer && <footer className="border-t border-line bg-card px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">{footer}</footer>}
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
