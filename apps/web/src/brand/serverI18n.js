import { notFound } from 'next/navigation';
import { lang } from 'next/root-params';
import { getDictionary, isSupportedLocale } from './i18n.js';

// Server-only helpers: `lang` is the root parameter from app/[lang], so no prop drilling is needed.
// Importing next/root-params fails the build if this file ends up in a client component.
export async function getRequestLocale() {
  const locale = await lang();
  if (!isSupportedLocale(locale)) notFound();
  return locale;
}

export async function getRequestDictionary() {
  return getDictionary(await getRequestLocale());
}
