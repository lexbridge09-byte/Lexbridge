'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_LOCALE, getLocaleFromPathname } from '@/brand/locales';
import { requestApi } from '@/lib/apiClient';
import { deriveLoginHref } from '@/lib/safeRedirect';

export function redirectToLogin() {
  const { pathname, search } = window.location;
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE;
  window.location.assign(deriveLoginHref(`${pathname}${search}`, locale));
}

// Loads JSON from the API. Pass null as the path to skip loading. A 401 sends the visitor to sign in.
export function useApiData(path) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const requestKey = path ? `${path}#${reloadCount}` : null;

  useEffect(() => {
    if (!path) return undefined;
    let isCancelled = false;
    const key = `${path}#${reloadCount}`;
    requestApi(path)
      .then((data) => {
        if (!isCancelled) setResult({ key, data, error: null });
      })
      .catch((error) => {
        if (isCancelled) return;
        if (error.status === 401) {
          redirectToLogin();
          return;
        }
        setResult({ key, data: null, error });
      });
    return () => {
      isCancelled = true;
    };
  }, [path, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const isCurrent = result.key === requestKey;

  return {
    // Previous data stays visible while a reload is in flight
    data: result.data,
    error: isCurrent ? result.error : null,
    isLoading: Boolean(path) && !isCurrent,
    reload,
  };
}
