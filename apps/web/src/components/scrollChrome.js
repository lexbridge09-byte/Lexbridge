'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/*
  Scroll-linked chrome without scroll listeners: one sentinel at the top of the document and two
  IntersectionObservers. The first sets html[data-scrolled] (header shadow in globals.css); the second
  shows "Back to top" once the reader is more than two screens down.
*/
export function ScrollChrome({ label }) {
  const sentinelRef = useRef(null);
  const [isFarDown, setIsFarDown] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sentinel = sentinelRef.current;

    const headerObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) delete root.dataset.scrolled;
      else root.dataset.scrolled = '';
    });
    // Growing the root two screens upward keeps the sentinel "visible" until the page has scrolled that far
    const distanceObserver = new IntersectionObserver(([entry]) => setIsFarDown(!entry.isIntersecting), {
      rootMargin: '200% 0px 0px 0px',
    });

    headerObserver.observe(sentinel);
    distanceObserver.observe(sentinel);
    return () => {
      headerObserver.disconnect();
      distanceObserver.disconnect();
      delete root.dataset.scrolled;
    };
  }, []);

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-2 w-px" />
      {/* Desktop only: phones already have the bottom tab bar; sits above the WhatsApp button */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={label}
        tabIndex={isFarDown ? 0 : -1}
        aria-hidden={!isFarDown}
        className={`fixed bottom-24 right-6 z-30 hidden size-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-raised transition-[opacity,transform,color] duration-(--dur-200) ease-(--ease-out-soft) hover:text-primary lg:flex print:hidden ${isFarDown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
      >
        <ArrowUp aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
    </>
  );
}
