import { FEATURE_DEPENDENCIES, FEATURE_FLAG_KEYS, FEATURE_FLAGS } from '@lexbridge/shared';
import { FeatureFlagModel } from '../models/index.js';

/*
  Runtime feature switches. The owner flips them in the admin panel; every API process picks the
  change up within FLAG_CACHE_TTL_MS (each cluster worker holds its own short-lived cache), and the
  writer invalidates immediately. If the database is unreachable we fall back to the code defaults,
  so a Mongo outage never takes the whole site down with it.
*/
const FLAG_CACHE_TTL_MS = Number(process.env.FLAG_CACHE_TTL_MS ?? 15_000);

let cachedFlags = null;
let cachedAt = 0;
let inflightLoad = null;

function normalizeStoredFlags(storedFlags) {
  // Only known keys, booleans only — everything else falls back to the code default
  const flags = { ...FEATURE_FLAGS };
  for (const [key, value] of Object.entries(storedFlags ?? {})) {
    if (Object.hasOwn(flags, key) && typeof value === 'boolean') flags[key] = value;
  }
  return flags;
}

async function loadFlags() {
  try {
    const stored = await FeatureFlagModel.find().select('Key Enabled').lean();
    const flags = normalizeStoredFlags(Object.fromEntries(stored.map((row) => [row.Key, row.Enabled])));
    // First boot (or keys added in an update): seed the collection so the admin panel lists everything
    const missingKeys = FEATURE_FLAG_KEYS.filter((key) => !stored.some((row) => row.Key === key));
    if (missingKeys.length > 0) {
      try {
        await FeatureFlagModel.insertMany(
          missingKeys.map((key) => ({ Key: key, Enabled: FEATURE_FLAGS[key] })),
          { ordered: false },
        );
      } catch {
        // A parallel worker seeded the same rows first; the cache still serves correct values
      }
    }
    cachedFlags = flags;
    cachedAt = Date.now();
    return flags;
  } catch (err) {
    // Keep the last known flags if we have them; otherwise the code defaults
    if (!cachedFlags) cachedFlags = { ...FEATURE_FLAGS };
    cachedAt = Date.now();
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[feature-flags] falling back to cached flags: ${err.message}`);
    }
    return cachedFlags;
  }
}

async function getRawFlags() {
  if (cachedFlags && Date.now() - cachedAt < FLAG_CACHE_TTL_MS) return cachedFlags;
  if (!inflightLoad) {
    inflightLoad = loadFlags().finally(() => {
      inflightLoad = null;
    });
  }
  return inflightLoad;
}

export function isFlagCacheFresh() {
  return Boolean(cachedFlags) && Date.now() - cachedAt < FLAG_CACHE_TTL_MS;
}

export function invalidateFlagCache() {
  cachedFlags = null;
  cachedAt = 0;
}

// Effective on/off state after the dependency cascade, e.g. coupons is off when onlinePayments is off
export async function getEffectiveFlags() {
  const raw = await getRawFlags();
  const evaluate = (key, seen = new Set()) => {
    if (seen.has(key)) return false;
    seen.add(key);
    if (!raw[key]) return false;
    return (FEATURE_DEPENDENCIES[key] ?? []).every((dependency) => evaluate(dependency, seen));
  };
  return Object.fromEntries(FEATURE_FLAG_KEYS.map((key) => [key, evaluate(key)]));
}

export async function isRuntimeFeatureEnabled(key) {
  const flags = await getEffectiveFlags();
  if (!Object.hasOwn(flags, key)) throw new Error(`Unknown feature flag: ${key}`);
  return flags[key];
}

// The stored (uncascaded) value plus effective state and dependents, for the admin panel
export async function getFlagDetails() {
  const raw = await getRawFlags();
  const effective = await getEffectiveFlags();
  const dependentsOf = (key) => FEATURE_FLAG_KEYS.filter((other) => (FEATURE_DEPENDENCIES[other] ?? []).includes(key));
  return FEATURE_FLAG_KEYS.map((key) => ({
    key,
    stored: raw[key],
    effective: effective[key],
    dependencies: FEATURE_DEPENDENCIES[key] ?? [],
    dependents: dependentsOf(key),
  }));
}

export async function setFlagEnabled(key, enabled, updatedBy) {
  if (!Object.hasOwn(FEATURE_FLAGS, key)) throw new Error(`Unknown feature flag: ${key}`);
  await FeatureFlagModel.updateOne(
    { Key: key },
    { $set: { Enabled: Boolean(enabled), UpdatedBy: updatedBy ?? null, updatedAt: new Date() } },
    { upsert: true },
  );
  invalidateFlagCache();
  return getEffectiveFlags();
}
