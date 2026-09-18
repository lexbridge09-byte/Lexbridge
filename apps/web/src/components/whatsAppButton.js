'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { hasStickyActionBar, hasStickyBuyBar, isAdminPath, isLoginPath } from '@/lib/chromeRoutes';

export function WhatsAppButton({ href, label, text }) {
  const pathname = usePathname() ?? '/';
  if (!href || isAdminPath(pathname) || isLoginPath(pathname)) return null;

  // Sit above the mobile tab bar, and above the sticky action bar where that is shown
  const mobileBottomClass = hasStickyActionBar(pathname) || hasStickyBuyBar(pathname)
    ? 'bottom-[calc(9rem+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(5rem+env(safe-area-inset-bottom))]';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      // One entrance 1.5s after load, never a looping pulse (MOTION_SPEC.md)
      className={`fixed right-4 z-30 ${mobileBottomClass} flex items-center gap-2 rounded-full bg-success p-3.5 text-white shadow-float transition-[filter,transform] duration-(--dur-150) ease-(--ease-out-soft) [animation-delay:1500ms] hover:brightness-110 active:scale-[0.97] motion-safe:animate-fade-in lg:bottom-6 lg:right-6 lg:px-5 lg:py-3 print:hidden`}
    >
      <MessageCircle aria-hidden="true" className="size-6 lg:size-5" strokeWidth={2} />
      <span className="hidden text-[15px] font-semibold lg:inline">{text}</span>
    </a>
  );
}
