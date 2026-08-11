/**
 * Deterministic device identity for attendance load tests.
 * Each VU/device must be unique to avoid DEVICE_BOUND_TO_OTHER_ACCOUNT.
 */
export function deviceIdentity(seed = `${__VU}-${__ITER}`) {
  const id = String(seed).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32) || "device";
  const pad = (s, n) => (s + "0".repeat(n)).slice(0, n);

  return {
    deviceFingerprint: `dev_${pad(`fp${id}`, 64)}`,
    browserFingerprint: `br_${pad(`br${id}`, 64)}`,
    deviceIdentifier: [
      pad(id.slice(0, 8), 8),
      "4aaa",
      "8aaa",
      pad(String(__VU).padStart(4, "0"), 4),
      pad(id.slice(-12), 12),
    ].join("-"),
    deviceMetadata: {
      platform: "k6-loadtest",
      source: "loadtests/k6",
      vu: __VU,
      iter: __ITER,
    },
  };
}
