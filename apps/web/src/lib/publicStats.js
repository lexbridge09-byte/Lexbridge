import { BRAND } from '@/brand';
import { formatNumber } from '@/lib/formatValues';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:5000';
const REVALIDATE_SECONDS = 300;
const REQUEST_TIMEOUT_MS = 2000;
const STAT_KEYS = ['requestsResolved', 'consultationsCompleted', 'documentsReviewed'];

// Real aggregate counts from GET /api/stats/public. Each figure below the brand minimum is left out,
// and the strip disappears when none qualify, so the page never shows thin or invented numbers.
export async function loadPublicStats(dictionary, locale) {
  let payload = null;
  try {
    const response = await fetch(`${API_ORIGIN}/api/stats/public`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) payload = await response.json();
  } catch {
    return [];
  }

  const source = payload?.stats;
  if (!source) return [];

  return STAT_KEYS.map((statKey) => ({ key: statKey, count: Number(source[statKey]) }))
    .filter((stat) => Number.isFinite(stat.count) && stat.count >= BRAND.publicStatsMinimum)
    .map((stat) => ({ key: stat.key, label: dictionary.home.stats[stat.key], value: formatNumber(stat.count, locale) }));
}
