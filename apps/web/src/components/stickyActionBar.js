'use client';

import { usePathname } from 'next/navigation';
import { CallbackRequestButton } from '@/components/callbackRequestButton';
import { ButtonLink } from '@/components/ui';
import { hasStickyActionBar } from '@/lib/chromeRoutes';

// Mobile-only primary action on browsing pages; task pages keep their own form buttons instead
export function StickyActionBar({ cta, label, title, note, hasCallback = false }) {
  const pathname = usePathname();
  if (!hasStickyActionBar(pathname)) return null;

  return (
    <>
      <div aria-hidden="true" className="h-[4.5rem] lg:hidden" />
      <aside
        aria-label={label}
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 px-4 py-2.5 shadow-[0_-6px_18px_rgb(31_23_32/0.06)] backdrop-blur-md lg:hidden print:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{title}</p>
            {note && <p className="truncate text-xs text-ink-muted">{note}</p>}
          </div>
          {hasCallback && <CallbackRequestButton variant="icon" />}
          <ButtonLink href={cta.href} size="sm" className="shrink-0">
            {cta.label}
          </ButtonLink>
        </div>
      </aside>
    </>
  );
}
