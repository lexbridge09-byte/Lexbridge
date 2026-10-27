'use client';

import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const HOVER_OPEN_MS = 250;
const HOVER_CLOSE_MS = 300;

// Native disclosure, not a hover-only menu: works with touch, Enter/Space and no JS.
// With a mouse it also opens on hover after a short intent delay, so passing over it doesn't fire it.
export function NavigationDisclosure({ label, triggerClassName, isWide = false, children }) {
  const pathname = usePathname();
  const disclosureRef = useRef(null);
  const hoverTimerRef = useRef(null);

  function scheduleHover(event, shouldOpen) {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      if (disclosureRef.current) disclosureRef.current.open = shouldOpen;
    }, shouldOpen ? HOVER_OPEN_MS : HOVER_CLOSE_MS);
  }
  useEffect(() => {
    const disclosure = disclosureRef.current;
    function closeOnEscape(event) {
      if (event.key !== 'Escape' || !disclosure?.open) return;
      disclosure.open = false;
      disclosure.querySelector('summary')?.focus();
    }
    // "Inside" is only the trigger or the visible panel: the full-width positioning layer around a
    // wide panel is empty space, so clicks there must close the menu too
    function closeOutside(event) {
      if (!disclosure?.open) return;
      const isOnTrigger = disclosure.querySelector('summary')?.contains(event.target);
      const isOnPanel = event.target.closest?.('[data-nav-panel]') && disclosure.contains(event.target);
      if (!isOnTrigger && !isOnPanel) {
        clearTimeout(hoverTimerRef.current);
        disclosure.open = false;
      }
    }
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [pathname]);

  return (
    <details
      ref={disclosureRef}
      key={pathname}
      name="primary-navigation"
      onPointerEnter={(event) => scheduleHover(event, true)}
      onPointerLeave={(event) => scheduleHover(event, false)}
      className={`group/nav ${isWide ? '' : 'relative'}`}
    >
      <summary className={`${triggerClassName} cursor-pointer list-none group-open/nav:bg-canvas-raised group-open/nav:text-on-canvas [&::-webkit-details-marker]:hidden`}>
        {label}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform duration-(--dur-150) group-open/nav:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div
        onClick={(event) => { if (event.target.closest('a') && disclosureRef.current) disclosureRef.current.open = false; }}
        className={`pointer-events-none absolute top-full z-50 pt-2 ${isWide ? 'inset-x-0' : 'right-0 w-64 max-w-[calc(100vw-2rem)]'}`}
      >
        {/* Only the panel itself takes the pointer; the positioning layer around it is click-through */}
        <div data-nav-panel className={`pointer-events-auto ${isWide ? 'mx-auto w-[min(72rem,calc(100%-3rem))]' : ''}`}>
          {children}
        </div>
      </div>
    </details>
  );
}
