import { ApiError, getDocumentDictionary } from '@/lib/apiClient';

// Multipart upload through the same-origin /api rewrite. Append text fields before the file
// so the API can read them while the file stream is processed.
// `onProgress(fraction)` reports 0–1 as bytes leave the browser (XHR, since fetch has no upload progress).
export function uploadApiFile(path, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `/api${path}`);
    request.withCredentials = true;
    request.responseType = 'json';

    if (onProgress) {
      request.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      });
    }

    request.addEventListener('load', () => {
      const data = request.response ?? {};
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve(data);
        return;
      }
      reject(new ApiError(data.error ?? getDocumentDictionary().common.states.uploadFailed, request.status, data.details ?? []));
    });
    request.addEventListener('error', () => reject(new ApiError(getDocumentDictionary().common.states.uploadNetworkError, 0)));
    request.addEventListener('abort', () => reject(new ApiError(getDocumentDictionary().common.states.uploadNetworkError, 0)));

    request.send(formData);
  });
}
