import { ApiError, getDocumentDictionary } from '@/lib/apiClient';

// Multipart upload through the same-origin /api rewrite. Append text fields before the file
// so the API can read them while the file stream is processed.
export async function uploadApiFile(path, formData) {
  let response;
  try {
    response = await fetch(`/api${path}`, { method: 'POST', body: formData, credentials: 'same-origin' });
  } catch {
    throw new ApiError(getDocumentDictionary().common.states.uploadNetworkError, 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error ?? getDocumentDictionary().common.states.uploadFailed, response.status, data.details ?? []);
  }
  return data;
}
