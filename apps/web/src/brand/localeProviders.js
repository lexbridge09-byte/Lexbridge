import { createElement } from 'react';
import { DEFAULT_LOCALE, isSupportedLocale } from './locales.js';
import { LocaleProviderEn } from './localeProviderEn.js';
import { LocaleProviderHi } from './localeProviderHi.js';

// One provider per language (each imports only its own dictionary). Register new languages here.
const LOCALE_PROVIDERS = Object.freeze({ en: LocaleProviderEn, hi: LocaleProviderHi });

// Renders the provider for the requested language, falling back to the default language
export function LocaleProvider({ locale, children }) {
  const Provider = LOCALE_PROVIDERS[isSupportedLocale(locale) ? locale : DEFAULT_LOCALE];
  return createElement(Provider, null, children);
}
