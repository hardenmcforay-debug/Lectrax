/**
 * Central HTTP security headers for Lectrax (Next.js `headers()` config).
 *
 * Content-Security-Policy is NOT set here — it is applied per-request in `proxy.ts`
 * with a cryptographic nonce (see `src/lib/security/csp.ts`). A static CSP cannot
 * carry request nonces and would conflict with the nonce + strict-dynamic policy.
 *
 * This module must stay free of `@/` imports and `next/server` so `next.config.ts`
 * can load it during config compilation.
 */

export type SecurityHeader = { key: string; value: string };

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Permissions-Policy — main app needs camera for QR attendance scanning. */
export function getPermissionsPolicy(options?: { allowCamera?: boolean }): string {
  const allowCamera = options?.allowCamera ?? true;
  const camera = allowCamera ? "(self)" : "()";
  return [
    `camera=${camera}`,
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "bluetooth=()",
    "interest-cohort=()",
  ].join(", ");
}

/** Baseline security headers applied to all application routes (CSP excluded — see proxy). */
export function getSecurityHeaders(options?: { allowCamera?: boolean }): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: getPermissionsPolicy(options) },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];

  if (isProduction()) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

const PRIVATE_NO_STORE: SecurityHeader[] = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0, must-revalidate",
  },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Vary", value: "Cookie" },
];

/** Next.js `headers()` configuration for the main Lectrax application. */
export function getAppSecurityHeaderRoutes(): Array<{ source: string; headers: SecurityHeader[] }> {
  const securityHeaders = getSecurityHeaders({ allowCamera: true });

  return [
    { source: "/:path*", headers: securityHeaders },
    {
      source: "/(student|lecturer|admin)/:path*",
      headers: PRIVATE_NO_STORE,
    },
    {
      source: "/(login|signup|forgot-password|reset-password)",
      headers: PRIVATE_NO_STORE,
    },
    {
      source: "/api/:path*",
      headers: PRIVATE_NO_STORE,
    },
    {
      source: "/auth/:path*",
      headers: PRIVATE_NO_STORE,
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.json",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
    },
  ];
}

/** Admin-only deployment — no camera access required. */
export function getAdminSecurityHeaderRoutes(): Array<{ source: string; headers: SecurityHeader[] }> {
  const securityHeaders = getSecurityHeaders({ allowCamera: false });

  return [
    { source: "/:path*", headers: securityHeaders },
    {
      source: "/admin/:path*",
      headers: PRIVATE_NO_STORE,
    },
    {
      source: "/(login|signup|forgot-password|reset-password)",
      headers: PRIVATE_NO_STORE,
    },
    {
      source: "/api/:path*",
      headers: PRIVATE_NO_STORE,
    },
    {
      source: "/auth/:path*",
      headers: PRIVATE_NO_STORE,
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.json",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
    },
  ];
}
