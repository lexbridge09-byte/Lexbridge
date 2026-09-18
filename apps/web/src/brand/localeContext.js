'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, localizedHref } from './locales.js';

const LocaleContext = createContext({ locale: DEFAULT_LOCALE, dictionary: null });

// The dictionary of the page being viewed, for non-React helpers (e.g. fallback API error wording)
let activeDictionary = null;

export function setActiveDictionary(dictionary) {
  activeDictionary = dictionary;
}

export function getActiveDictionary() {
  return activeDictionary;
}

// Rendered by localeProviderEn / localeProviderHi, which each import only their own language
export function LocaleProviderBase({ locale, dictionary, children }) {
  const value = useMemo(() => ({ locale, dictionary }), [locale, dictionary]);
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export function useLocale() {
  return useContext(LocaleContext).locale;
}

export function useDictionary() {
  return useContext(LocaleContext).dictionary;
}

export function useLocalizedHref() {
  const locale = useLocale();
  return useCallback((href) => localizedHref(locale, href), [locale]);
}
