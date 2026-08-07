import { scale, env } from "../lib/env.js";

/**
 * Scale profiles for Lectrax load validation.
 * SCALE = target peak concurrent virtual users.
 * 50k/100k require ALLOW_DISTRIBUTED_SCALE=true + k6 Cloud / distributed runners.
 */
export const PROFILES = {
  100: {
    label: "100 concurrent users",
    stages: [
      { duration: "1m", target: 20 },
      { duration: "3m", target: 100 },
      { duration: "5m", target: 100 },
      { duration: "1m", target: 0 },
    ],
    arrival: [
      { duration: "1m", target: 10 },
      { duration: "3m", target: 50 },
      { duration: "5m", target: 50 },
      { duration: "1m", target: 0 },
    ],
  },
  500: {
    label: "500 concurrent users",
    stages: [
      { duration: "2m", target: 100 },
      { duration: "5m", target: 500 },
      { duration: "10m", target: 500 },
      { duration: "2m", target: 0 },
    ],
    arrival: [
      { duration: "2m", target: 50 },
      { duration: "5m", target: 200 },
      { duration: "10m", target: 200 },
      { duration: "2m", target: 0 },
    ],
  },
  1000: {
    label: "1,000 concurrent users",
    stages: [
      { duration: "3m", target: 200 },
      { duration: "5m", target: 1000 },
      { duration: "15m", target: 1000 },
      { duration: "3m", target: 0 },
    ],
    arrival: [
      { duration: "3m", target: 100 },
      { duration: "5m", target: 400 },
      { duration: "15m", target: 400 },
      { duration: "3m", target: 0 },
    ],
  },
  5000: {
    label: "5,000 concurrent users",
    stages: [
      { duration: "5m", target: 1000 },
      { duration: "10m", target: 5000 },
      { duration: "20m", target: 5000 },
      { duration: "5m", target: 0 },
    ],
    arrival: [
      { duration: "5m", target: 400 },
      { duration: "10m", target: 1500 },
      { duration: "20m", target: 1500 },
      { duration: "5m", target: 0 },
    ],
  },
  10000: {
    label: "10,000 concurrent users",
    stages: [
      { duration: "5m", target: 2000 },
      { duration: "10m", target: 10000 },
      { duration: "20m", target: 10000 },
      { duration: "5m", target: 0 },
    ],
    arrival: [
      { duration: "5m", target: 800 },
      { duration: "10m", target: 3000 },
      { duration: "20m", target: 3000 },
      { duration: "5m", target: 0 },
    ],
  },
  50000: {
    label: "50,000 concurrent users",
    distributed: true,
    stages: [
      { duration: "10m", target: 10000 },
      { duration: "15m", target: 50000 },
      { duration: "30m", target: 50000 },
      { duration: "10m", target: 0 },
    ],
    arrival: [
      { duration: "10m", target: 2000 },
      { duration: "15m", target: 8000 },
      { duration: "30m", target: 8000 },
      { duration: "10m", target: 0 },
    ],
  },
  100000: {
    label: "100,000 concurrent users",
    distributed: true,
    stages: [
      { duration: "15m", target: 20000 },
      { duration: "20m", target: 100000 },
      { duration: "40m", target: 100000 },
      { duration: "15m", target: 0 },
    ],
    arrival: [
      { duration: "15m", target: 4000 },
      { duration: "20m", target: 15000 },
      { duration: "40m", target: 15000 },
      { duration: "15m", target: 0 },
    ],
  },
};

function nearestKey(n) {
  const keys = Object.keys(PROFILES)
    .map(Number)
    .sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) {
    if (Math.abs(k - n) < Math.abs(best - n)) best = k;
  }
  return best;
}

export function currentProfile() {
  const n = scale();
  const key = PROFILES[n] ? n : nearestKey(n);
  const profile = PROFILES[key];
  const allowDistributed = env("ALLOW_DISTRIBUTED_SCALE") === "true";

  if (profile.distributed && !allowDistributed) {
    return {
      scale: key,
      effectiveScale: 1000,
      capped: true,
      ...PROFILES[1000],
      label: `${profile.label} (capped to 1k locally — set ALLOW_DISTRIBUTED_SCALE=true)`,
    };
  }

  return {
    scale: key,
    effectiveScale: key,
    capped: false,
    ...profile,
    label: PROFILES[n] ? profile.label : `${n} users → nearest ${profile.label}`,
  };
}

export function vuScenario(name) {
  const profile = currentProfile();
  return {
    scenarios: {
      [name]: {
        executor: "ramping-vus",
        startVUs: 0,
        stages: profile.stages,
        gracefulRampDown: "30s",
        tags: {
          scale: String(profile.effectiveScale),
          profile: profile.label,
        },
      },
    },
  };
}

export function arrivalScenario(name) {
  const profile = currentProfile();
  return {
    scenarios: {
      [name]: {
        executor: "ramping-arrival-rate",
        startRate: 1,
        timeUnit: "1s",
        preAllocatedVUs: Math.min(profile.effectiveScale, 2000),
        maxVUs: Math.min(profile.effectiveScale, Number(env("MAX_VUS", "10000"))),
        stages: profile.arrival,
        tags: {
          scale: String(profile.effectiveScale),
          profile: profile.label,
        },
      },
    },
  };
}
