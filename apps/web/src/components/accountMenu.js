'use client';

import { ChevronDown, CircleUserRound, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary, useLocalizedHref } from '@/brand/localeContext';
import { LocaleLink } from '@/components/localeLink';
import { requestApi } from '@/lib/apiClient';
import { clearSession, useSession } from '@/lib/session';

const TRIGGER_CLASS =
  'flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-1 text-ink hover:bg-surface-alt sm:rounded-xl sm:px-2.5 sm:text-[15px] sm:font-medium';
const ITEM_CLASS = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-primary-50 focus:bg-primary-50 focus:outline-none';

function deriveInitials(user) {
  const words = (user.FullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) return words.slice(0, 2).map((word) => word[0].toUpperCase()).join('');
  return (user.Email ?? '?')[0].toUpperCase();
}

function deriveFirstName(user) {
  return (user.FullName ?? '').trim().split(/\s+/)[0] || (user.Email ?? '').split('@')[0];
}

// "Sign in" for visitors, an account menu (menu button pattern) once signed in. Width is reserved while loading.
export function AccountMenu({ signInHref, signInLabel }) {
  const router = useRouter();
  const toLocalized = useLocalizedHref();
  const dictionary = useDictionary();
  const copy = dictionary.ux.account;
  const { status, user } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  if (status === 'loading') {
    return <span aria-hidden="true" className="block h-11 w-11 sm:w-28" />;
  }

  if (status !== 'signedIn') {
    return (
      <LocaleLink href={signInHref} aria-label={signInLabel} className={`${TRIGGER_CLASS} w-11 sm:w-auto sm:min-w-28 sm:text-ink/85`}>
        <CircleUserRound aria-hidden="true" className="size-5" strokeWidth={1.75} />
        <span className="hidden sm:inline">{signInLabel}</span>
      </LocaleLink>
    );
  }

  const items = [
    { key: 'dashboard', href: '/dashboard', label: copy.dashboard },
    isFeatureEnabled('onlinePayments') && { key: 'orders', href: '/dashboard/orders', label: copy.orders },
    isFeatureEnabled('documentUploads') && { key: 'documents', href: '/dashboard/documents', label: copy.documents },
    isFeatureEnabled('aiDocumentReview') && { key: 'reviews', href: '/dashboard/document-reviews', label: copy.documentReviews },
    user.Role === 'admin' && { key: 'admin', href: '/admin', label: copy.admin },
  ].filter(Boolean);

  function focusItem(offset) {
    const menuItems = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])];
    if (menuItems.length === 0) return;
    const currentIndex = menuItems.indexOf(document.activeElement);
    const nextIndex = offset === 'first' ? 0 : offset === 'last' ? menuItems.length - 1 : (currentIndex + offset + menuItems.length) % menuItems.length;
    menuItems[nextIndex].focus();
  }

  function openMenu(focusTarget = 'first') {
    setIsOpen(true);
    requestAnimationFrame(() => focusItem(focusTarget));
  }

  function closeMenu({ returnFocus = true } = {}) {
    setIsOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function handleButtonKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(event.key === 'ArrowDown' ? 'first' : 'last');
    }
  }

  function handleMenuKeyDown(event) {
    const actions = { ArrowDown: 1, ArrowUp: -1, Home: 'first', End: 'last' };
    if (event.key in actions) {
      event.preventDefault();
      focusItem(actions[event.key]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Tab') {
      closeMenu({ returnFocus: false });
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await requestApi('/auth/logout', { method: 'POST' });
    } catch {
      // The cookie may already be gone; continue either way
    }
    clearSession();
    setIsOpen(false);
    setIsSigningOut(false);
    router.replace(toLocalized('/'));
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={copy.menuLabel}
        onClick={() => (isOpen ? closeMenu({ returnFocus: false }) : openMenu())}
        onKeyDown={handleButtonKeyDown}
        className={`${TRIGGER_CLASS} sm:min-w-28`}
      >
        <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-cta text-xs font-bold text-white">
          {deriveInitials(user)}
        </span>
        <span className="hidden max-w-[6rem] truncate sm:inline">{deriveFirstName(user)}</span>
        <ChevronDown aria-hidden="true" className="hidden size-4 text-ink-muted sm:block" strokeWidth={2} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={copy.menuLabel}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-white p-1.5 shadow-card"
        >
          <p className="truncate px-3 py-2 text-xs text-ink-muted">{user.Email}</p>
          {items.map((item) => (
            <LocaleLink key={item.key} href={item.href} role="menuitem" tabIndex={-1} onClick={() => setIsOpen(false)} className={ITEM_CLASS}>
              {item.label}
            </LocaleLink>
          ))}
          <div className="my-1 border-t border-line" />
          <button type="button" role="menuitem" tabIndex={-1} onClick={handleSignOut} disabled={isSigningOut} className={`${ITEM_CLASS} text-danger`}>
            <LogOut aria-hidden="true" className="size-4" strokeWidth={2} />
            {isSigningOut ? copy.signingOut : copy.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
