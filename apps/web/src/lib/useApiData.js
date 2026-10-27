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
  const [resource, setResource] = useState({ path });
  const [result, setResult] = useState({ resource: null, reloadCount: -1, data: null, error: null });

  // A new resource identity also prevents A -> disabled -> A from resurrecting
  // an old response. React retries this render before committing its children.
  if (resource.path !== path) setResource({ path });

  useEffect(() => {
    if (!resource.path) return undefined;
    let isCancelled = false;
    requestApi(resource.path)
      .then((data) => {
        if (!isCancelled) setResult({ resource, reloadCount, data, error: null });
      })
      .catch((error) => {
        if (isCancelled) return;
        if (error.status === 401) {
          redirectToLogin();
          return;
        }
        setResult({ resource, reloadCount, data: null, error });
      });
    return () => {
      isCancelled = true;
    };
  }, [resource, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const isSameResource = Boolean(path) && resource.path === path && result.resource === resource;
  const isCurrent = isSameResource && result.reloadCount === reloadCount;

  return {
    // Keep the current response visible while it is being refreshed, but never
    // show a response from a different path (or from a disabled request).
    data: isSameResource ? result.data : null,
    error: isCurrent ? result.error : null,
    isLoading: Boolean(path) && !isCurrent,
    reload,
  };
}
