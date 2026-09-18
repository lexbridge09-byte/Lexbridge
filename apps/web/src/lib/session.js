'use client';

import { useSyncExternalStore } from 'react';
import { requestApi } from '@/lib/apiClient';

// Who is signed in, fetched once from /api/auth/me and shared by every component that asks
const LOADING_SESSION = { status: 'loading', user: null };
const SIGNED_OUT_SESSION = { status: 'signedOut', user: null };

let currentSession = LOADING_SESSION;
let pendingRequest = null;
const listeners = new Set();

function publish(nextSession) {
  currentSession = nextSession;
  listeners.forEach((listener) => listener());
}

export function refreshSession() {
  pendingRequest = requestApi('/auth/me')
    .then(({ user }) => publish(user ? { status: 'signedIn', user } : SIGNED_OUT_SESSION))
    .catch(() => publish(SIGNED_OUT_SESSION));
  return pendingRequest;
}

export function clearSession() {
  pendingRequest = Promise.resolve();
  publish(SIGNED_OUT_SESSION);
}

function subscribe(listener) {
  listeners.add(listener);
  if (!pendingRequest) refreshSession();
  return () => listeners.delete(listener);
}

export function useSession() {
  return useSyncExternalStore(
    subscribe,
    () => currentSession,
    () => LOADING_SESSION,
  );
}
