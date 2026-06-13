const CACHE_PREFIX = "lectrax:cache:";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 6;

type CacheEntry<T> = {
  value: T;
  savedAt: number;
  ttlMs: number;
};

export type OfflineCacheKey = "profile" | "dashboard-summary" | "navigation-state" | "recent-sessions";

function getStorageKey(key: OfflineCacheKey): string {
  return `${CACHE_PREFIX}${key}`;
}

function readEntry<T>(key: OfflineCacheKey): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getStorageKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

export function readOfflineCache<T>(key: OfflineCacheKey): T | null {
  const entry = readEntry<T>(key);
  if (!entry) return null;

  const age = Date.now() - entry.savedAt;
  if (age > entry.ttlMs) {
    clearOfflineCache(key);
    return null;
  }

  return entry.value;
}

export function writeOfflineCache<T>(
  key: OfflineCacheKey,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (typeof window === "undefined") return;

  const entry: CacheEntry<T> = {
    value,
    savedAt: Date.now(),
    ttlMs,
  };

  try {
    window.localStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  } catch {
    // Ignore quota or privacy mode failures.
  }
}

export function clearOfflineCache(key: OfflineCacheKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getStorageKey(key));
}
