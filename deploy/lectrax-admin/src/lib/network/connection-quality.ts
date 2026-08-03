export type ConnectionQuality = "online" | "offline" | "slow";

export type NetworkSample = {
  /** Wall time from request start to settle. */
  durationMs: number;
  /** HTTP completed (any status). */
  ok: boolean;
  timedOut?: boolean;
  /** Failed before any HTTP response (DNS, connection reset, etc.). */
  networkError?: boolean;
  /**
   * Long-running transfers (e.g. file uploads). Duration alone must not mark
   * the connection as poor — only timeouts / network errors count.
   */
  ignoreDuration?: boolean;
};

const SLOW_REQUEST_MS = 6_000;
const VERY_SLOW_REQUEST_MS = 10_000;
const RECOVERY_FAST_MS = 2_000;
const SLOW_WINDOW_MS = 30_000;
const SLOW_CONFIRM_COUNT = 2;
const RECOVERY_FAST_STREAK = 2;

type QualityListener = (quality: ConnectionQuality) => void;

const listeners = new Set<QualityListener>();
const slowHits: number[] = [];
let observedSlow = false;
let fastSuccessStreak = 0;

function pruneSlowHits(now: number) {
  while (slowHits.length > 0 && now - slowHits[0]! > SLOW_WINDOW_MS) {
    slowHits.shift();
  }
}

function emitQuality() {
  const quality = getConnectionQuality();
  for (const listener of listeners) {
    listener(quality);
  }
}

/** Current quality: offline from navigator, slow only from observed request health. */
export function getConnectionQuality(): ConnectionQuality {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "offline";
  }
  return observedSlow ? "slow" : "online";
}

/**
 * Soft hint for timeouts only. Never drives the poor-connection toast by itself —
 * browser Network Information API (saveData / 2g estimates) is too noisy.
 */
export function readConnectionQuality(isOnline: boolean): ConnectionQuality {
  if (!isOnline) return "offline";
  return observedSlow ? "slow" : "online";
}

/**
 * Record a same-origin API sample so "Poor connection" reflects real request health,
 * not speculative browser network estimates.
 */
export function reportNetworkSample(sample: NetworkSample): void {
  if (typeof window === "undefined") return;

  if (!navigator.onLine) {
    if (observedSlow) {
      observedSlow = false;
      slowHits.length = 0;
      fastSuccessStreak = 0;
      emitQuality();
    }
    return;
  }

  const now = Date.now();
  pruneSlowHits(now);

  const isHardFailure = Boolean(sample.timedOut || sample.networkError);
  const isSlowDuration =
    !sample.ignoreDuration && sample.durationMs >= SLOW_REQUEST_MS;
  const isVerySlow =
    !sample.ignoreDuration && sample.durationMs >= VERY_SLOW_REQUEST_MS;

  if (isHardFailure || isSlowDuration) {
    slowHits.push(now);
    pruneSlowHits(now);
    fastSuccessStreak = 0;

    const shouldMarkSlow =
      isHardFailure || isVerySlow || slowHits.length >= SLOW_CONFIRM_COUNT;

    if (shouldMarkSlow && !observedSlow) {
      observedSlow = true;
      emitQuality();
    }
    return;
  }

  // Successful long uploads are not evidence of a healthy fast link — skip recovery.
  if (sample.ignoreDuration) {
    return;
  }

  if (sample.ok && sample.durationMs < RECOVERY_FAST_MS) {
    fastSuccessStreak += 1;
    if (observedSlow && fastSuccessStreak >= RECOVERY_FAST_STREAK) {
      observedSlow = false;
      slowHits.length = 0;
      fastSuccessStreak = 0;
      emitQuality();
    }
  }
}

export function subscribeToConnectionQuality(
  onChange: QualityListener
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  listeners.add(onChange);
  onChange(getConnectionQuality());

  const onOnline = () => {
    // Stay on "online" until samples prove otherwise; clear stale slow flag.
    observedSlow = false;
    slowHits.length = 0;
    fastSuccessStreak = 0;
    emitQuality();
  };

  const onOffline = () => {
    observedSlow = false;
    slowHits.length = 0;
    fastSuccessStreak = 0;
    emitQuality();
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

export function getAdaptiveFetchTimeoutMs(quality: ConnectionQuality): number {
  if (quality === "slow" || quality === "offline") {
    return 45_000;
  }
  return 30_000;
}
