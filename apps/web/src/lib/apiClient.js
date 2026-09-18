import { getActiveDictionary } from '@/brand/localeContext';

// Browser-side helper. Next.js rewrites /api/* to the Express API, so requests stay same-origin.
export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Fallback wording follows the language of the page being viewed
export function getDocumentDictionary() {
  return getActiveDictionary();
}

export async function requestApi(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(getDocumentDictionary().common.states.networkError, 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error ?? getDocumentDictionary().common.states.genericError, response.status, data.details ?? []);
  }
  return data;
}

export function extractFieldErrors(error) {
  return Object.fromEntries((error?.details ?? []).map((detail) => [detail.path, detail.message]));
}
