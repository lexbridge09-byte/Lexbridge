import { stripLocale } from '@/brand/locales';

// Which mobile chrome (bottom tab bar, sticky action bar) each route gets. Paths may include the locale.

// Task pages already have their own primary action, so a second sticky one would compete with it
const TASK_PATH_PREFIXES = [
  '/consultation',
  '/contact',
  '/drafting',
  '/find-my-solution',
  '/login',
  '/dashboard',
  '/admin',
  '/team',
  '/checkout',
  '/document-review',
];

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Once someone starts a form, keep navigation/help but remove competing promotions.
export function isFocusedTaskPath(pathname) {
  if (!pathname) return false;
  const path = stripLocale(pathname);
  return ['/consultation', '/drafting', '/document-review', '/find-my-solution', '/contact', '/checkout', '/login']
    .some((prefix) => matchesPrefix(path, prefix));
}

export function isAdminPath(pathname) {
  return Boolean(pathname) && matchesPrefix(stripLocale(pathname), '/admin');
}

export function isTeamPath(pathname) {
  return Boolean(pathname) && matchesPrefix(stripLocale(pathname), '/team');
}

// Back-office area: own chrome (sidebar + office header), marketing chrome hidden
export function isOfficePath(pathname) {
  return isAdminPath(pathname) || isTeamPath(pathname);
}

export function isLoginPath(pathname) {
  return Boolean(pathname) && matchesPrefix(stripLocale(pathname), '/login');
}

export function hasMobileTabBar(pathname) {
  return !isOfficePath(pathname) && !isFocusedTaskPath(pathname);
}

// Product pages carry their own sticky buy bar instead of the generic one
export function hasStickyBuyBar(pathname) {
  return Boolean(pathname) && /^\/services\/[^/]+/.test(stripLocale(pathname));
}

export function hasStickyActionBar(pathname) {
  if (!pathname || hasStickyBuyBar(pathname)) return false;
  const pathWithoutLocale = stripLocale(pathname);
  return !TASK_PATH_PREFIXES.some((prefix) => matchesPrefix(pathWithoutLocale, prefix));
}
