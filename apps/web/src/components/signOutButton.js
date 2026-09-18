'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDictionary, useLocalizedHref } from '@/brand/localeContext';
import { requestApi } from '@/lib/apiClient';
import { clearSession } from '@/lib/session';

export function SignOutButton({ className = '' }) {
  const router = useRouter();
  const toLocalized = useLocalizedHref();
  const copy = useDictionary().common.signOut;
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await requestApi('/auth/logout', { method: 'POST' });
    } catch {
      // The session cookie may already be gone; continue to the home page either way
    }
    clearSession();
    router.replace(toLocalized('/'));
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={`inline-flex items-center gap-2 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      <LogOut aria-hidden="true" className="size-4" strokeWidth={2} />
      {isSigningOut ? copy.busy : copy.idle}
    </button>
  );
}
