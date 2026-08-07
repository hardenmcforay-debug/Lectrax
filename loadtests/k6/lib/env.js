/**
 * Lectrax load-test environment helpers.
 * Pass via: k6 run -e BASE_URL=... -e SCALE=1000 ...
 */
export function env(name, fallback = "") {
  const value = __ENV[name];
  if (value === undefined || value === null || value === "") return fallback;
  return value;
}

export function requiredEnv(name) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function baseUrl() {
  return env("BASE_URL", "http://localhost:3000").replace(/\/$/, "");
}

export function scale() {
  const n = Number(env("SCALE", "100"));
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.floor(n);
}

export function boolEnv(name, fallback = false) {
  const raw = env(name, fallback ? "true" : "false").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** When true, treat HTTP 429 as expected (rate-limit soak) instead of failure. */
export function allowRateLimits() {
  return boolEnv("ALLOW_RATE_LIMITS", true);
}

export function thinkTimeSeconds() {
  const n = Number(env("THINK_TIME_S", "1"));
  return Number.isFinite(n) && n >= 0 ? n : 1;
}
