// Server-side calls straight to the Express API (server components only)
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
