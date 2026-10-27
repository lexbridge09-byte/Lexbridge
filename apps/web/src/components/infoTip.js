'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_PADDING_PX = 8;
const GAP_PX = 8;
const TIP_WIDTH_PX = 256;

/*
  Small "?" that reveals supporting text on hover, keyboard focus or tap, so headings and labels stay
  short. Screen-aware (Floating UI's flip + shift): the tip is portalled to <body>, opens below or flips
  above when there's no room, and slides horizontally to stay inside the viewport.
  The text is always in the DOM (visually hidden) so `id` can feed a field's aria-describedby.
*/
export function InfoTip({ id, label = '?', children, tone = 'light' }) {
  const generatedId = useId();
  const textId = id ?? generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function closeOutside(event) {
      if (!buttonRef.current?.contains(event.target)) setIsOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  // Measure after render: flip vertically if needed, then shift horizontally into the viewport
  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    function place() {
      const anchor = buttonRef.current?.getBoundingClientRect();
      const tipHeight = tipRef.current?.offsetHeight ?? 48;
      if (!anchor) return;
      const width = Math.min(TIP_WIDTH_PX, window.innerWidth - VIEWPORT_PADDING_PX * 2);
      const centredLeft = anchor.left + anchor.width / 2 - width / 2;
      const left = Math.min(Math.max(VIEWPORT_PADDING_PX, centredLeft), window.innerWidth - width - VIEWPORT_PADDING_PX);
      const hasRoomBelow = anchor.bottom + GAP_PX + tipHeight <= window.innerHeight - VIEWPORT_PADDING_PX;
      const top = hasRoomBelow ? anchor.bottom + GAP_PX : Math.max(VIEWPORT_PADDING_PX, anchor.top - GAP_PX - tipHeight);
      setPosition({ left, top, width });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen]);

  const isDark = tone === 'dark';
  return (
    <span
      className="relative inline-flex align-middle"
      onPointerEnter={(event) => event.pointerType === 'mouse' && setIsOpen(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setIsOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-describedby={textId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className={`flex size-[18px] items-center justify-center rounded-full text-[11px] font-bold leading-none transition-colors duration-(--dur-150) ${isDark ? 'bg-canvas-raised text-on-canvas-muted hover:bg-primary/25 hover:text-primary-bright' : 'bg-card-dim text-ink-muted hover:bg-primary-100 hover:text-primary-dark'} ${isOpen ? (isDark ? 'bg-primary/25 text-primary-bright' : 'bg-primary-100 text-primary-dark') : ''}`}
      >
        {label}
      </button>
      {/* Always present for aria-describedby; visible copy is the portalled tip below */}
      <span id={textId} className="sr-only">
        {children}
      </span>
      {isOpen &&
        createPortal(
          <span
            ref={tipRef}
            role="tooltip"
            aria-hidden="true"
            style={position ? { left: position.left, top: position.top, width: position.width } : { visibility: 'hidden', left: 0, top: 0 }}
            className={`pointer-events-none fixed z-[90] rounded-control px-3 py-2 text-xs font-normal leading-5 shadow-raised motion-safe:animate-[pop-in_var(--dur-150)_var(--ease-out-soft)_both] ${isDark ? 'bg-card text-ink' : 'bg-canvas text-on-canvas'}`}
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}
