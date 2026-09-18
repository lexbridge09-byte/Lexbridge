const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:5000';
const REVALIDATE_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 3000;

// Published catalogue products for listing pages. Cached briefly; an unreachable API yields an empty list,
// so pages fall back to the service areas instead of failing.
export async function loadPublishedProducts() {
  try {
    const response = await fetch(`${API_ORIGIN}/api/products`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.products) ? payload.products : [];
  } catch {
    return [];
  }
}
