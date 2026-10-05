'use client';

import { CalendarClock, Circle, ClipboardList, FileSearch, FolderOpen, LayoutDashboard, LayoutList, MessagesSquare, MessageCircle, MessageSquareText, Newspaper, Package, PanelLeftClose, PanelLeftOpen, PhoneCall, TicketPercent, ToggleLeft, UserPlus, UserRound, Users, Briefcase, Boxes, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCallback, useSyncExternalStore } from 'react';
import { stripLocale } from '@/brand/locales';
import { useDictionary } from '@/brand/localeContext';
import { LocaleLink } from '@/components/localeLink';
import { useSession } from '@/lib/session';

const COLLAPSED_KEY = 'lexbridge.officeSidebar.collapsed';
const COLLAPSE_EVENT = 'lexbridge:office-sidebar-collapse';

// Collapsed state lives in localStorage and syncs across tabs; server always paints expanded.
function subscribeToCollapse(onChange) {
  window.addEventListener('storage', onChange);
  window.addEventListener(COLLAPSE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(COLLAPSE_EVENT, onChange);
  };
}

function isCollapsedOnClient() {
  const stored = localStorage.getItem(COLLAPSED_KEY);
  if (stored !== null) return stored === '1';
  // No explicit choice yet: tablets start collapsed, desktops expanded
  return window.innerWidth < 1024;
}

// Icon per area, resolved inside the client component (component references can't cross the
// server -> client boundary). Unmapped links get a neutral circle.
const ICONS_BY_HREF = {
  '/admin': LayoutDashboard,
  '/admin/requests': ClipboardList,
  '/admin/orders': Package,
  '/admin/callbacks': PhoneCall,
  '/admin/consultations': MessagesSquare,
  '/admin/slots': CalendarClock,
  '/admin/products': Boxes,
  '/admin/coupons': TicketPercent,
  '/admin/document-reviews': FileSearch,
  '/admin/articles': Newspaper,
  '/admin/whatsapp': MessageCircle,
  '/admin/users': Users,
  '/admin/features': ToggleLeft,
  '/team': Briefcase,
  '/team/desk': LayoutList,
  '/team/lawyers': UserPlus,
  '/dashboard': Home,
  '/dashboard/requests': ClipboardList,
  '/dashboard/orders': Package,
  '/dashboard/consultations': CalendarClock,
  '/dashboard/document-reviews': FileSearch,
  '/dashboard/documents': FolderOpen,
  '/dashboard/profile': UserRound,
};

function iconFor(href) {
  return ICONS_BY_HREF[href] ?? Circle;
}

/*
  Office sidebar for /admin, /team and /dashboard: flush to the viewport's left edge below the
  header, collapsible to an icon rail (state persists in localStorage). On mobile it becomes the
  horizontal tab strip. Hrefs are locale-free; `exact` links only match their own path.
*/
export function OfficeSidebar({ label, links, footer }) {
  const dictionary = useDictionary();
  const pathWithoutLocale = stripLocale(usePathname() ?? '/');
  const { status, user } = useSession();
  const isCollapsed = useSyncExternalStore(subscribeToCollapse, isCollapsedOnClient, () => false);

  const visibleLinks = links.filter((link) => {
    if (!link.roles) return true;
    return status === 'signedIn' && link.roles.includes(user?.Role);
  });

  function isActive(link) {
    return link.exact
      ? pathWithoutLocale === link.href
      : pathWithoutLocale === link.href || pathWithoutLocale.startsWith(`${link.href}/`);
  }

  const toggleCollapsed = useCallback(() => {
    localStorage.setItem(COLLAPSED_KEY, isCollapsed ? '0' : '1');
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, [isCollapsed]);

  const collapseLabel = isCollapsed ? dictionary.common.expandSidebar : dictionary.common.collapseSidebar;

  return (
    <>
      {/* Desktop: flush-left rail, collapsible to icons */}
      <aside
        className={`sticky top-16 flex h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto overflow-x-clip border-r border-line-canvas bg-surface-alt transition-[width] duration-(--dur-200) ease-(--ease-standard) motion-reduce:transition-none ${isCollapsed ? 'w-[3.75rem]' : 'w-60'}`}
      >
        <div className={`flex items-center px-2 pt-3 ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-label={collapseLabel}
            title={isCollapsed ? collapseLabel : undefined}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-control text-on-canvas-muted transition-colors duration-(--dur-150) hover:bg-canvas-raised hover:text-on-canvas"
          >
            {isCollapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
            )}
          </button>
        </div>
        <nav aria-label={label} className="flex-1 px-2 pb-3">
          <ul className="flex flex-col gap-1">
            {visibleLinks.map((link) => {
              const isCurrent = isActive(link);
              const Icon = iconFor(link.href);
              return (
                <li key={link.href}>
                  <LocaleLink
                    href={link.href}
                    aria-current={isCurrent ? 'page' : undefined}
                    title={isCollapsed ? link.label : undefined}
                    className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors duration-(--dur-150) ease-(--ease-productive) ${isCollapsed ? 'justify-center px-0' : ''} ${isCurrent ? 'bg-primary-50 text-primary-dark' : 'text-on-canvas-muted hover:bg-canvas-raised hover:text-on-canvas'}`}
                  >
                    <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.75} />
                    {!isCollapsed && <span className="ml-3 truncate">{link.label}</span>}
                  </LocaleLink>
                </li>
              );
            })}
          </ul>
        </nav>
        {footer && <div className={`border-t border-line-canvas px-2 py-2 ${isCollapsed ? 'flex justify-center' : ''}`}>{footer}</div>}
      </aside>
    </>
  );
}
