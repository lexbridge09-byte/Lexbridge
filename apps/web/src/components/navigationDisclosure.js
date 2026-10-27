'use client';

import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Native disclosure, not a hover-only menu: works with touch, Enter/Space and no JS.
export function NavigationDisclosure({ label, triggerClassName, isWide = false, children }) {
  const pathname = usePathname();
  const disclosureRef = useRef(null);
  useEffect(() => {
    const disclosure = disclosureRef.current;
    function closeOnEscape(event) {
      if (event.key !== 'Escape' || !disclosure?.open) return;
      disclosure.open = false;
      disclosure.querySelector('summary')?.focus();
    }
    function closeOutside(event) {
      if (disclosure?.open && !disclosure.contains(event.target)) disclosure.open = false;
    }
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [pathname]);

  return (
    <details ref={disclosureRef} key={pathname} name="primary-navigation" className={`group/nav ${isWide ? '' : 'relative'}`}>
      <summary className={`${triggerClassName} cursor-pointer list-none group-open/nav:bg-canvas-raised group-open/nav:text-on-canvas [&::-webkit-details-marker]:hidden`}>
        {label}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform duration-(--dur-150) group-open/nav:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div
        onClick={(event) => { if (event.target.closest('a') && disclosureRef.current) disclosureRef.current.open = false; }}
        className={`absolute top-full z-50 pt-2 ${isWide ? 'inset-x-0' : 'right-0 w-64 max-w-[calc(100vw-2rem)]'}`}
      >
        {children}
      </div>
    </details>
  );
}
