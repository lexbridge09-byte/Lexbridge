// Server-side calls straight to the Express API (server components only)
import { cookies } from 'next/headers';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:5000';
const REQUEST_TIMEOUT_MS = 5000;

// Resolves to { status, data }. status 0 means the API could not be reached.
export async function loadPublicApi(path) {
  try {
    const response = await fetch(`${API_ORIGIN}/api${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return { status: response.status, data: null };
    return { status: response.status, data: await response.json() };
  } catch {
    return { status: 0, data: null };
  }
}

/*
  Authenticated server read: forwards the visitor's session cookie so layouts can gate by role
  before rendering (no client-side flash of the wrong view). Returns null when signed out or
  when the API is unreachable — callers treat null as signed out.
*/
export async function loadAuthedUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('lexbridge_session');
    if (!sessionCookie) return null;
    const response = await fetch(`${API_ORIGIN}/api/auth/me`, {
      cache: 'no-store',
      headers: { cookie: `lexbridge_session=${sessionCookie.value}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.user ?? null;
  } catch {
    return null;
  }
}
