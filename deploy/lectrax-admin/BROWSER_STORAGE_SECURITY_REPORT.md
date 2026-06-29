# Lectrax Browser Storage Security Review

**Date:** June 18, 2026  
**Scope:** Client-side storage, auth persistence, state management, URL/query exposure, logging, and service worker caching  
**Constraint:** No functional, UI, or business-logic changes beyond security hardening.

---

## 1. Storage Mechanisms Audited

| Mechanism | Usage in Lectrax | Finding |
|-----------|------------------|---------|
| **localStorage** | Remember-email, offline cache (removed), attendance device UUID | Primary area reviewed and hardened |
| **sessionStorage** | Not used | No issues |
| **IndexedDB** | Not used directly (Supabase may use internally) | No direct app usage |
| **Cookies** | Supabase SSR session via `@supabase/ssr` | Server + middleware set `Secure`/`SameSite` in production |
| **Cache Storage (SW)** | `public/sw.js` — static assets + non-protected shell pages only | Protected routes and API excluded |
| **In-memory state** | Zustand `auth-store` (no persistence plugin) | Cleared on logout |
| **window globals** | PWA install prompt handle only | No sensitive data |

---

## 2. Sensitive Storage Locations Found

| Location | Data stored | Risk | Action taken |
|----------|-------------|------|--------------|
| `OfflineCacheWriter` → `lectrax:cache:profile` | Full `Profile` (email, phone, college ID, subscription) | **High** — unnecessary PII in localStorage | **Removed** — writer deleted; no reader existed |
| `OfflineCacheWriter` → `lectrax:cache:dashboard-summary` | Student name, college ID, course/enrollment IDs | **High** — unnecessary PII | **Removed** |
| `lectrax_remember_email` | Login email when "Remember me" checked | **Low** — user-opt-in PII, not credentials | **Kept** — documented; key centralized |
| `lectrax_attendance_device_id` | Random UUID for device verification | **Low** — operational, not auth secret | **Kept** — required for attendance anti-fraud |
| Supabase auth cookies (`sb-*-auth-token`) | Session/access tokens | **Medium** — required for auth; JS-readable by Supabase design | **Mitigated** — `Secure`/`SameSite` on server/middleware; see backend notes |
| Payment redirect `?payment=<uuid>` | Payment record ID in URL/history | **Medium** — financial identifier in browser history | **Removed** from redirect URLs; legacy URLs stripped on load |
| QR scan `?token=<jwt>` | Attendance token in URL/history | **Medium** — short-lived secret in address bar | **Stripped** from URL after processing |

---

## 3. Security Issues Fixed

### Removed unnecessary PII persistence
- Stopped writing student `profile` and `dashboard-summary` to `localStorage` (dead code — nothing read the cache).
- Deleted `src/components/errors/offline-cache-writer.tsx`.
- Added `clearAllOfflineCache()` and invoke it on logout.

### Centralized secure logout
- New `signOutAndClearClientStorage()` clears Supabase session, offline cache, and in-memory auth state.
- Applied to all user-initiated logout paths (sidebar + mobile headers).
- Failed/partial auth flows call `clearClientStorageAfterAuthReset()` after `signOut()`.

### Cookie hardening alignment
- `src/lib/supabase/server.ts` now applies `withSecureCookieOptions()` (matching middleware) for `Secure` + `SameSite=Lax` in production.

### Sensitive query string exposure
- Payment success redirects no longer include `payment=<id>` in URL.
- Subscription page strips sensitive params (`payment`, `token`, etc.) via `history.replaceState`.
- QR scanner strips `token` from URL after scan is submitted.

### Client logging
- Removed raw error object from `SessionPageClient` console output (avoids accidental data leakage in devtools).
- Attendance debug logs remain **development-only** and gated by `NODE_ENV`.

---

## 4. Files Modified

| File | Change |
|------|--------|
| `src/lib/security/client-storage.ts` | **New** — storage keys, URL param stripping, cache cleanup |
| `src/lib/auth/client-sign-out.ts` | **New** — centralized sign-out + storage purge |
| `src/lib/offline/cache.ts` | `clearAllOfflineCache()`, security documentation |
| `src/app/student/page.tsx` | Removed offline PII writers |
| `src/components/errors/offline-cache-writer.tsx` | **Deleted** |
| `src/lib/supabase/server.ts` | Secure cookie options on session cookies |
| `src/components/auth/auth-form.tsx` | Remember-email key constant; clear cache on auth reset |
| `src/components/layout/dashboard-sidebar.tsx` | Secure logout |
| `src/components/student/student-mobile-header.tsx` | Secure logout |
| `src/components/lecturer/lecturer-mobile-header.tsx` | Secure logout |
| `src/components/admin/admin-mobile-header.tsx` | Secure logout |
| `src/app/api/payments/checkout/route.ts` | Payment ID removed from success URL |
| `src/components/lecturer/payment-checkout-flow.tsx` | Payment ID removed from USSD redirect |
| `src/components/lecturer/subscription-page-content.tsx` | Strip sensitive URL params on load |
| `src/components/student/qr-scanner.tsx` | Strip attendance token from URL after use |
| `src/components/lecturer/session-page-client.tsx` | Safer error logging |

---

## 5. Remaining Risks & Accepted Trade-offs

| Risk | Severity | Notes |
|------|----------|-------|
| Supabase session cookies readable by client JS | Medium | Required for `@supabase/ssr` browser session refresh. True **HttpOnly** tokens need a backend BFF pattern — see recommendations. |
| Remember-me email in localStorage | Low | User-opt-in only; not a password or token. Removing would change UX. |
| Attendance device UUID in localStorage | Low | Operational identifier for fraud prevention; not an auth credential. |
| Service worker caches public shell pages | Low | `/lecturer`, `/student`, `/admin` navigations are **not** cached; API/auth/Supabase excluded. |
| Server-side `console.error` in API routes | Info | Server logs only; not exposed in end-user browser. Uses error messages, not full payloads. |
| `deploy/lectrax-admin/` export | Info | Re-export with `npm run export:admin` to sync admin deploy artifact. |

---

## 6. What Was Verified as Secure

- **No passwords, API keys, or service-role secrets** stored in browser storage.
- **Zustand auth store** has no `persist` middleware — memory only.
- **Monime/webhook/cron secrets** are server-only (`src/lib/env.ts`).
- **Service worker** (`public/sw.js`) blocks caching of `/api/*`, `/auth/*`, Supabase URLs, and protected portal routes.
- **Error sanitization** (`sanitizeErrorMessage`, `sanitizeContext`) redacts tokens/secrets from API and log output.
- **Payment checkout** uses server-side session; no card data touches client storage.

---

## 7. Recommendations for Backend Cooperation

1. **HttpOnly session cookies (optional hardening)**  
   If full protection of access/refresh tokens from JavaScript is required, introduce a backend-for-frontend (BFF) layer that holds tokens in HttpOnly cookies and exposes only opaque session IDs to the client. This is a larger architectural change beyond frontend-only scope.

2. **Session expiry cleanup**  
   Middleware already redirects unauthenticated users. Consider a client `onAuthStateChange` listener to call `clearSensitiveClientStorage()` on `SIGNED_OUT` / `TOKEN_REFRESHED` failures for defense-in-depth.

3. **Content-Security-Policy**  
   Add CSP headers in `next.config.ts` to reduce XSS impact if tokens remain JS-accessible (complements prior input-sanitization review).

4. **Audit log retention**  
   Ensure server-side audit logs for payments and attendance do not echo full tokens in metadata fields.

---

## 8. Verification

- `npm run typecheck` — **passes**
- Logout still signs out via Supabase and redirects to `/login`
- Remember-me, attendance scanning, and payment success banners behave as before
- No new UI or navigation changes

---

## 9. Storage Architecture (After Hardening)

```
Login (remember me) → localStorage[email only, opt-in]
Attendance device   → localStorage[UUID only, operational]
Auth session        → Supabase cookies (Secure/SameSite in prod)
App state           → React / Zustand (memory, cleared on logout)
Offline cache       → Not written; cleared on logout if legacy data exists
URL params          → Sensitive values stripped after use
Service worker      → Static assets only; no API/auth/portal HTML cache
```
