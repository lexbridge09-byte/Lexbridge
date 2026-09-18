import { localizedHref, stripLocale } from '@/brand/locales';

// Only same-origin relative paths are allowed, so ?next= can't send people to another site
export function deriveSafeNextPath(value) {
  if (typeof value !== 'string') return '';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '';
  const pathWithoutLocale = stripLocale(value.split(/[?#]/)[0]);
  if (pathWithoutLocale === '/login' || pathWithoutLocale.startsWith('/login/')) return '';
  return value;
}

export function deriveLoginRedirect(nextPath, user, locale) {
  const safeNextPath = deriveSafeNextPath(nextPath);
  if (safeNextPath) return localizedHref(locale, safeNextPath);
  return localizedHref(locale, user?.Role === 'admin' ? '/admin' : '/dashboard');
}

export function deriveLoginHref(nextPath, locale) {
  const loginPath = localizedHref(locale, '/login');
  const safeNextPath = deriveSafeNextPath(nextPath);
  return safeNextPath ? `${loginPath}?next=${encodeURIComponent(localizedHref(locale, safeNextPath))}` : loginPath;
}
