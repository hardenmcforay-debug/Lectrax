/**
 * Central HTTP security headers for Lectrax (Next.js `headers()` config).
 */

export type SecurityHeader = { key: string; value: string };

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getSupabaseCspHosts(): { https: string; wss: string } {
  const fallback = { https: "https://*.supabase.co", wss: "wss://*.supabase.co" };
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configured) return fallback;

  try {
    const host = new URL(configured).host;
    return { https: `https://${host}`, wss: `wss://${host}` };
  } catch {
    return fallback;
  }
}

/** Permissions-Policy — main app needs camera (QR scan) and geolocation (optional attendance GPS). */
export function getPermissionsPolicy(options?: { allowCamera?: boolean }): string {
  const allowCamera = options?.allowCamera ?? true;
  const camera = allowCamera ? "(self)" : "()";
  return [
    `camera=${camera}`,
    "microphone=()",
    "geolocation=(self)",
    "payment=()",
    "usb=()",
    "bluetooth=()",
    "interest-cohort=()",
  ].join(", ");
}

/**
 * Content-Security-Policy tuned for Next.js App Router, Supabase Auth/REST/Realtime/Storage,
 * PWA inline bootstrap scripts, Tailwind inline styles, and html5-qrcode camera scanning.
 */
export function getContentSecurityPolicy(): string {
  const isDev = !isProduction();
  const supabase = getSupabaseCspHosts();

  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    // Exact project host + wildcard so custom or standard Supabase Storage URLs work in PWA.
    `img-src 'self' data: blob: https://*.supabase.co ${supabase.https}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase.https} ${supabase.wss}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self' blob:",
    "frame-ancestors 'none'",
  ];

  if (isProduction()) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/** Baseline security headers applied to all application routes. */
export function getSecurityHeaders(options?: { allowCamera?: boolean }): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: getContentSecurityPolicy() },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
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
