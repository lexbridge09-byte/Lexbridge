/*
  The language registry: the one place that defines which languages the site supports.

  To add a language (e.g. Tamil):
    1. Add an entry below.
    2. Add brand/copy/<code>/ with the same shape as brand/copy/en/ (the i18n key check enforces it).
    3. Register its dictionary in brand/i18n.js and its provider in brand/localeProviders.js
       (static imports are needed so each browser bundle only ships its own language).
  Routing, the proxy redirect, <html lang>, hreflang alternates and the language switcher all read from here.

  Deliberately free of dictionary imports so the proxy and client components can use it cheaply.
*/
export const LOCALES = Object.freeze([
  Object.freeze({ code: 'en', tag: 'en-IN', label: 'English', script: 'latin' }),
  Object.freeze({ code: 'hi', tag: 'hi-IN', label: 'हिंदी', script: 'devanagari' }),
]);

export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const SUPPORTED_LOCALES = LOCALES.map((locale) => locale.code);

// Shown in the language switcher in each language's own script, whatever the current locale
export const LOCALE_LABELS = Object.freeze(Object.fromEntries(LOCALES.map((locale) => [locale.code, locale.label])));

// BCP 47 tags for <html lang> and Intl formatting
export const LOCALE_TAGS = Object.freeze(Object.fromEntries(LOCALES.map((locale) => [locale.code, locale.tag])));

export function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(value);
}

export function getLocaleTag(locale) {
  return LOCALE_TAGS[isSupportedLocale(locale) ? locale : DEFAULT_LOCALE];
}

export function getLocaleFromPathname(pathname) {
  const firstSegment = typeof pathname === 'string' ? pathname.split('/')[1] : '';
  return isSupportedLocale(firstSegment) ? firstSegment : null;
}

// "/hi/services" -> "/services"; "/hi" -> "/"
export function stripLocale(pathname) {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return pathname || '/';
  return pathname.slice(locale.length + 1) || '/';
}

// Adds the locale to internal paths. External URLs, hashes, API paths and already-localised paths pass through.
export function localizedHref(locale, href) {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  if (href === '/api' || href.startsWith('/api/') || href.startsWith('/api?')) return href;
  const pathOnly = href.split(/[?#]/)[0];
  if (getLocaleFromPathname(pathOnly)) return href;
  const safeLocale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  if (pathOnly === '/') return `/${safeLocale}${href.slice(1)}`;
  return `/${safeLocale}${href}`;
}
