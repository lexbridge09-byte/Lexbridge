import { NextResponse } from 'next/server';
// The language registry has no dictionary imports, so the proxy bundle stays small
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from '@/brand/locales';

const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const SESSION_COOKIE_NAME = 'lexbridge_session';
const PROTECTED_PATH_PATTERN = /^\/(dashboard|admin)(\/|$)/;

// Next buffers proxied bodies up to experimental.proxyClientMaxBodySize (12mb) and truncates the rest,
// which would reach the API as a broken upload. Reject anything larger here, before the rewrite runs.
const MAX_UPLOAD_REQUEST_BYTES = 12 * 1024 * 1024;
const UPLOAD_PATHS = new Set(['/api/documents', '/api/admin/documents', '/api/document-reviews']);

function isOversizedUpload(request) {
  if (request.method !== 'POST' || !UPLOAD_PATHS.has(request.nextUrl.pathname)) return false;
  return Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_REQUEST_BYTES;
}

// Saved preference first, then the browser's Accept-Language, then English
function detectLocale(request) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale;

  const preferredLanguages = (request.headers.get('accept-language') ?? '')
    .split(',')
    .map((part) => {
      const [tag, qualityPart] = part.trim().split(';q=');
      return { language: tag.toLowerCase().split('-')[0], quality: qualityPart ? Number(qualityPart) : 1 };
    })
    .filter((entry) => entry.language && Number.isFinite(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  return preferredLanguages.find((entry) => SUPPORTED_LOCALES.includes(entry.language))?.language ?? DEFAULT_LOCALE;
}

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (isOversizedUpload(request)) {
      return NextResponse.json({ error: 'This file is larger than 10 MB.' }, { status: 413 });
    }
    return NextResponse.next();
  }

  const pathLocale = pathname.split('/')[1];
  if (!SUPPORTED_LOCALES.includes(pathLocale)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${detectLocale(request)}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  // Optimistic check only: whether the session cookie exists. The API verifies the session and role on every request.
  const pathWithoutLocale = pathname.slice(pathLocale.length + 1) || '/';
  if (PROTECTED_PATH_PATTERN.test(pathWithoutLocale) && !request.cookies.has(SESSION_COOKIE_NAME)) {
    const loginUrl = new URL(`/${pathLocale}/login`, request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  if (request.cookies.get(LOCALE_COOKIE_NAME)?.value !== pathLocale) {
    response.cookies.set(LOCALE_COOKIE_NAME, pathLocale, { path: '/', maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS, sameSite: 'lax' });
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)', '/api/documents', '/api/admin/documents', '/api/document-reviews'],
};
