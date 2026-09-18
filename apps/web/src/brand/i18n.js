import { EN_DICTIONARY } from './copy/en/index.js';
import { HI_DICTIONARY } from './copy/hi/index.js';
import { DEFAULT_LOCALE, isSupportedLocale } from './locales.js';

// Server-side dictionary lookup (loads every language). Client components read their dictionary from
// the locale provider instead, so the browser only downloads the active language.
export * from './locales.js';

const DICTIONARIES = { en: EN_DICTIONARY, hi: HI_DICTIONARY };

export function getDictionary(locale) {
  return DICTIONARIES[isSupportedLocale(locale) ? locale : DEFAULT_LOCALE];
}
