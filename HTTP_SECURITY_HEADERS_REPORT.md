# HTTP Security Headers Review Report

**Application:** Lectrax (Next.js 15 + Supabase, Vercel deployment)  
**Date:** June 18, 2026  
**Scope:** HTTP response headers across main app, admin deploy, PWA assets, and API routes  
**Constraint:** No UI/UX/business-logic changes

---

## Executive Summary

Before this review, Lectrax applied **partial** security headers via `next.config.ts` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) but was **missing Content-Security-Policy (CSP)**, **HSTS on the main app**, centralized configuration, and **Cache-Control** for authenticated surfaces.

Headers are now centralized in `src/lib/security/headers.ts` and applied through Next.js `headers()` for all routes. Production responses include a **Supabase-compatible CSP**, **HSTS**, **clickjacking protection**, **MIME-sniffing protection**, **Referrer-Policy**, **Permissions-Policy**, **COOP**, and **no-store caching** on sensitive pages and APIs.

**No application functionality was changed** — only HTTP response metadata.

---

## Existing Headers Discovered (Before)

| Header | Main app (`next.config.ts`) | Admin deploy | Notes |
|--------|----------------------------|--------------|-------|
| `X-Content-Type-Options: nosniff` | Yes | Yes (via `transport.ts`) | Present |
| `X-Frame-Options: DENY` | Yes | Yes | Present |
| `Referrer-Policy: strict-origin-when-cross-origin` | Yes | Yes | Present |
| `Permissions-Policy` | `camera=(self), geolocation=(self)` | `camera=(), geolocation=()` | Present, duplicated |
| `Strict-Transport-Security` | **No** | Yes (production only, in `transport.ts`) | Main app gap |
| `Content-Security-Policy` | **No** | **No** | Missing |
| `Cross-Origin-Opener-Policy` | **No** | **No** | Missing |
| `X-DNS-Prefetch-Control` | **No** | **No** | Missing |
| `Cache-Control` (sensitive routes) | **Partial** (`sw.js` only) | Partial | Gap on dashboards/API |

`vercel.json` contains only cron configuration — no header overrides.

`src/lib/security/transport.ts` defined `getSecurityHeaders()` with HSTS but the **main app did not use it**.

---

## Security Headers Added / Enhanced

### Configuration module

**New:** `src/lib/security/headers.ts`  
**Updated:** `next.config.ts`, `src/lib/security/transport.ts` (re-exports), `deploy/lectrax-admin/next.config.ts`, `scripts/export-admin-app.mjs`

| Header | Value (production) | Purpose |
|--------|-------------------|---------|
| **Content-Security-Policy** | See below | Restricts script/style/connect sources; mitigates XSS and unauthorized resource loading |
| **Strict-Transport-Security** | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS; prevents SSL stripping |
| **X-Content-Type-Options** | `nosniff` | Prevents MIME-type confusion attacks |
| **X-Frame-Options** | `DENY` | Prevents clickjacking via iframes |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Limits referrer leakage on cross-origin navigation |
| **Permissions-Policy** | Main: `camera=(self), geolocation=(self), …` / Admin: `camera=()` | Restricts browser feature access |
| **Cross-Origin-Opener-Policy** | `same-origin` | Isolates browsing context from cross-origin popups |
| **X-DNS-Prefetch-Control** | `off` | Reduces passive DNS prefetch leakage |
| **Cache-Control** | `private, no-store, max-age=0, must-revalidate` | On sensitive routes (see below) |

### Content-Security-Policy (production)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.supabase.co;
font-src 'self';
connect-src 'self' https://<supabase-host> wss://<supabase-host>;
media-src 'self' blob:;
worker-src 'self' blob:;
manifest-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

**Development** adds `script-src 'unsafe-eval'` for Next.js HMR and omits `upgrade-insecure-requests` for localhost HTTP.

`connect-src` uses `NEXT_PUBLIC_SUPABASE_URL` when set, otherwise `*.supabase.co` wildcards.

---

## CSP Exceptions (Required for Compatibility)

| Directive | Exception | Reason |
|-----------|-----------|--------|
| `script-src 'unsafe-inline'` | PWA bootstrap scripts in `pwa-head-links.tsx`; Next.js inline hydration/bootstrap | Required to preserve PWA install prompt and App Router behavior without nonce middleware refactor |
| `script-src 'unsafe-eval'` (dev only) | Next.js dev server / HMR | Development only; not sent in production |
| `style-src 'unsafe-inline'` | Tailwind / React inline styles | Standard for Next.js + Tailwind stacks |
| `img-src https://*.supabase.co` | Site logo, hero image, assignment assets | Supabase Storage public/signed URLs |
| `connect-src` Supabase HTTPS + WSS | Auth, REST, Realtime channels | `session-page-client`, `attendance-session-panel`, `student-notifications-provider` |
| `media-src blob:` | QR scanner (`html5-qrcode`) | Camera preview streams |
| `worker-src blob:` | Service worker / scanner workers | PWA + html5-qrcode |
| `form-action 'self'` | All forms POST to same origin | Monime checkout uses `window.location` redirect (navigation, not form POST) |

**Not in CSP (by design):**
- Monime API (`api.monime.io`) — called **server-side only** from API routes, not from the browser
- External social links on landing footer — plain `<a href>` navigation, not `connect-src`

---

## Permissions-Policy

### Main application
```
camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=(), interest-cohort=()
```
- **camera=(self)** — student QR attendance scanning (`html5-qrcode`)
- **geolocation=(self)** — optional GPS on attendance scan when lecturer enables `require_gps`

### Admin deployment
```
camera=(), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=(), interest-cohort=()
```
- Camera disabled — admin portal does not scan QR codes

---

## Cache-Control for Sensitive Content

| Route pattern | Header | Rationale |
|---------------|--------|-----------|
| `/student/*`, `/lecturer/*`, `/admin/*` | `private, no-store, must-revalidate` | Authenticated dashboards |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | `private, no-store, must-revalidate` | Auth flows |
| `/api/*` | `private, no-store, must-revalidate` | API responses with user/session data |
| `/auth/*` | `private, no-store, must-revalidate` | OAuth callback |
| `/sw.js` | `no-cache, no-store, must-revalidate` | Service worker must update promptly |
| `/manifest.json` | `public, max-age=86400` | PWA manifest (non-sensitive) |
| `/_next/static/*` | (Next.js default) | Immutable hashed assets remain cacheable |

---

## Configuration Changes Made

| File | Change |
|------|--------|
| `src/lib/security/headers.ts` | **New** — CSP, HSTS, Permissions-Policy, route-specific cache rules |
| `next.config.ts` | Uses `getAppSecurityHeaderRoutes()` |
| `src/lib/security/transport.ts` | Re-exports header helpers; retains HTTPS env validation |
| `deploy/lectrax-admin/next.config.ts` | Uses `getAdminSecurityHeaderRoutes()` |
| `deploy/lectrax-admin/src/lib/security/headers.ts` | Copied from main app |
| `deploy/lectrax-admin/src/lib/security/transport.ts` | Re-exports from `headers.ts` |
| `scripts/export-admin-app.mjs` | Admin export template updated |

---

## Compatibility Validation

| Feature | Status | Notes |
|---------|--------|-------|
| Supabase Auth (login, signup, OAuth callback) | Compatible | `connect-src` allows Supabase origin; cookies unchanged |
| Supabase Realtime (attendance, notifications) | Compatible | `wss://` allowed in `connect-src` |
| Supabase Storage images | Compatible | `img-src` includes `*.supabase.co` |
| QR attendance scanner | Compatible | `camera` permission + `media-src blob:` |
| PWA install prompt | Compatible | Inline bootstrap scripts allowed via `'unsafe-inline'` |
| Service worker | Compatible | `worker-src 'self' blob:`; existing `sw.js` cache headers preserved |
| Monime payment redirect | Compatible | Top-level navigation to external checkout URL (not blocked by CSP) |
| Google Fonts (`next/font/google`) | Compatible | Fonts self-hosted by Next.js — `font-src 'self'` |
| Excel export download | Compatible | Blob download from same-origin API response |
| Admin dashboards | Compatible | Same header stack; camera disabled in Permissions-Policy |
| Vercel deployment | Compatible | Headers set at Next.js layer; `vercel.json` unchanged |

**Verification:** `npm run typecheck` and `npm run build` — **pass**

---

## Security Improvements Achieved

| Threat | Mitigation |
|--------|------------|
| XSS (stored/reflected) | CSP restricts script sources; `object-src 'none'` |
| Unauthorized third-party scripts | `script-src 'self'` + controlled inline exception |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Protocol downgrade | HSTS with preload eligibility (production) |
| Referrer leakage | `strict-origin-when-cross-origin` |
| Unwanted device access | Permissions-Policy restricts camera/mic/USB |
| Sensitive page caching | `Cache-Control: no-store` on auth portals and APIs |
| Cross-origin window attacks | `Cross-Origin-Opener-Policy: same-origin` |

---

## Remaining Risks & Future Hardening

| Severity | Risk | Recommendation |
|----------|------|----------------|
| **Low** | CSP uses `'unsafe-inline'` for scripts | Migrate to **nonce-based CSP** via Next.js middleware when feasible; removes inline script allowance |
| **Low** | CSP uses `'unsafe-inline'` for styles | Consider hashed style nonces if Tailwind supports strict mode in future |
| **Info** | HSTS preload | Submit domain to [hstspreload.org](https://hstspreload.org) after verifying all subdomains serve HTTPS |
| **Info** | `report-uri` / `report-to` | Add CSP violation reporting endpoint for production monitoring |
| **Info** | Vercel edge | Optional duplicate headers in Vercel project settings as belt-and-suspenders |

---

## Header Reference (Quick)

```
Content-Security-Policy: <directives>
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload  [production only]
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=(self), ...
Cross-Origin-Opener-Policy: same-origin
X-DNS-Prefetch-Control: off
Cache-Control: private, no-store, max-age=0, must-revalidate  [sensitive routes]
```

---

## Related Reports

- `CSRF_SECURITY_REPORT.md`
- `API_ENDPOINT_SECURITY_REPORT.md`
- `SECRETS_SECURITY_REPORT.md`
- `SECURITY_REVIEW_REPORT.md` (input validation)

---

*End of HTTP Security Headers Review*
