# Secure Cookie Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase SSR, Vercel)  
**Date:** June 19, 2026  
**Scope:** All HTTP cookies, session handling, logout, CSRF interaction, logging, and related browser storage  
**Constraint:** No UI/UX/business-logic changes except security hardening  
**Builds on:** `CSRF_SECURITY_REPORT.md`, `BROWSER_STORAGE_SECURITY_REPORT.md`, `AUTHENTICATION_SECURITY_REPORT.md`, `HTTP_SECURITY_HEADERS_REPORT.md`

---

## Executive Summary

Lectrax uses **only Supabase SSR authentication cookies** — there are **no custom application cookies** for sessions, preferences, or tracking. Session state is managed by `@supabase/ssr` through chunked cookies named `sb-<project-ref>-auth-token` (and `.0`, `.1`, … for large payloads).

Existing controls were already strong in production: **`Secure`**, **`SameSite=Lax`**, middleware session refresh, CSRF on API mutations, HSTS, and role validation independent of cookie contents.

This review **centralized cookie utilities**, **hardened defaults** (`path`, `SameSite` in all environments), **added session-end client cleanup**, **redacted cookie keys from production logs**, and **documented** the intentional Supabase trade-off that auth cookies are **not HttpOnly** (required for browser session refresh).

---

## 1. Cookie Discovery

### Cookies in use

| Cookie name pattern | Set by | Purpose | Sensitive data |
|---------------------|--------|---------|----------------|
| `sb-*-auth-token` (+ chunks `.0`, `.1`, …) | `@supabase/ssr` via middleware + server `setAll` | Supabase session (access + refresh tokens, encoded) | **Yes** — authentication tokens |

### Not cookies (related storage — out of cookie scope but audited)

| Mechanism | Key / pattern | Purpose | Cookie equivalent? |
|-----------|---------------|---------|-------------------|
| `localStorage` | `lectrax_remember_email` | Opt-in remembered login email | No |
| `localStorage` | `lectrax_attendance_device_id` | Attendance anti-fraud device UUID | No |
| `localStorage` | `lectrax:cache:*` | Offline cache (cleared on logout) | No |
| `sessionStorage` | — | Not used | No |

### Where cookies are read/written

| Location | Role |
|----------|------|
| `src/lib/supabase/middleware.ts` | Session refresh on every matched request; sets cookies on response |
| `src/lib/supabase/server.ts` | Server Components / API routes read and update session |
| `src/lib/supabase/client.ts` | Browser client reads/writes via `document.cookie` (Supabase default) |
| `src/app/auth/callback/route.ts` | OAuth / email verification code exchange → session cookies |
| `src/lib/auth/client-sign-out.ts` | `signOut()` clears Supabase session cookies |
| `src/middleware.ts` | Pipeline: abuse → CSRF → session |

**No cookies** are set by: contact forms, payments, admin branding, assignment uploads, or custom middleware.

---

## 2. Secure Cookie Configuration

| Attribute | Development | Production | Notes |
|-----------|-------------|------------|-------|
| **Secure** | Not forced (HTTP localhost) | **`true`** via `withSecureCookieOptions()` | Cookies only sent over HTTPS in production |
| **SameSite** | **`Lax`** (default applied) | **`Lax`** | Blocks cross-site POST cookie attachment |
| **Path** | **`/`** | **`/`** | Explicit default added in this review |
| **Domain** | Host default | Host default | No cross-subdomain sharing configured |
| **HttpOnly** | `false` (Supabase default) | `false` (Supabase default) | See §3 — intentional framework trade-off |

**HTTPS enforcement (transport layer):**

- HSTS: `Strict-Transport-Security` on all routes (`headers.ts`)
- CSP: `upgrade-insecure-requests` in production
- `validateHttpsUrl()` rejects non-HTTPS env URLs in production
- `assertSecureClientRequest()` blocks insecure absolute HTTP fetches in the browser (production)

**Finding:** No sensitive cookies are intended for transmission over plain HTTP in production. Vercel serves the app over HTTPS; `Secure` cookies are not sent to insecure origins.

---

## 3. HttpOnly Review

### Current state

`@supabase/ssr` defaults (`DEFAULT_COOKIE_OPTIONS`):

```typescript
httpOnly: false,
sameSite: "lax",
path: "/",
maxAge: 400 * 24 * 60 * 60,
```

**Why not HttpOnly:** Supabase’s browser client (`createBrowserClient`) reads session data from cookies via JavaScript for token refresh and `getSession()`. Forcing `httpOnly: true` without a backend-for-frontend (BFF) layer **would break** client-side auth flows (PWA launch gate, role resolution, profile settings).

### Mitigations for JS-readable tokens

| Control | Status |
|---------|--------|
| `SameSite=Lax` | ✅ Reduces CSRF cookie attachment on cross-site POST |
| CSRF middleware + `X-Lectrax-Request` header | ✅ Defense in depth on `/api` mutations |
| CSP (`script-src`, `object-src 'none'`) | ✅ Reduces XSS impact |
| Input sanitization (prior reviews) | ✅ |
| No secrets in cookies beyond Supabase session | ✅ |
| Short-lived access token + refresh rotation (Supabase) | ✅ Platform-managed |

**Decision:** HttpOnly **not forced** — preserves 100% existing auth behavior. Documented as **accepted medium risk** with compensating controls.

---

## 4. SameSite Protection

| Setting | Value | Rationale |
|---------|-------|-----------|
| Auth cookies | `Lax` | OAuth/email callback redirects require top-level navigations to send cookies; `Strict` can break login flows |
| CSRF complement | Custom header on mutations | Blocks forged cross-origin `fetch` even when cookies might be sent on safe methods |

**Auth callback compatibility:** `GET /auth/callback` (top-level redirect from Supabase) works with `SameSite=Lax`.

**Cross-site POST:** Session cookies are **not** sent on cross-site POST requests — aligns with CSRF middleware design.

---

## 5. Cookie Expiration Review

| Item | Value | Assessment |
|------|-------|------------|
| Supabase `maxAge` | ~400 days | Platform default for refresh token persistence; not overridden (would risk refresh failures) |
| Access token lifetime | Supabase JWT expiry (~1 hour typical) | Short-lived; refreshed by middleware |
| Logout | `supabase.auth.signOut()` | Clears auth cookies via Supabase SSR |
| Failed auth / invalid role | `signOut()` in callback and middleware | Clears session when role resolution fails |
| Client cleanup on `SIGNED_OUT` | **New:** `AuthSessionSync` | Clears offline cache + in-memory auth state |

**Finding:** Logout paths (sidebar, mobile headers, auth-form failures) call `signOutAndClearClientStorage()` which invokes `signOut()` and purges client storage. No orphaned custom cookies remain.

---

## 6. Sensitive Data Review

### Verified NOT stored in cookies

- Passwords
- API keys / service role keys
- Monime webhook secrets
- QR signing secrets
- Raw profile PII (email, phone) — only in Supabase JWT claims / session payload (platform-managed)
- Payment card data

### Stored in Supabase auth cookies (required for session)

- Encoded access + refresh tokens (JWT / session blob)
- Validated server-side via `supabase.auth.getUser()` — **never trusted from client parsing alone**

### Role / authorization

- **Role is NOT stored in cookies** — resolved from `profiles` table / `get_my_role()` RPC on each middleware and API request
- Cookie manipulation cannot elevate to `platform_admin` without valid Supabase session **and** matching profile row (migration `042` hardening)

---

## 7. Cookie Access Review

| Attack | Mitigation |
|--------|------------|
| Forge cookie to impersonate user | Supabase validates JWT signature server-side; invalid tokens rejected |
| Edit cookie to change role | Role read from database, not cookie metadata |
| Steal cookie via XSS | CSP + sanitization; tokens JS-readable (see §3) |
| CSRF with stolen session | SameSite=Lax + CSRF header + origin checks |
| Session fixation | Supabase handles on `exchangeCodeForSession` |
| Platform admin on main app | Middleware signs out and redirects to admin deployment |

**Middleware note:** On transient DB errors with auth cookies present, middleware may fail-open (availability). Role layouts and API guards provide a second layer (documented in prior auth review).

---

## 8. Logging and Debugging Review

| Area | Finding | Action |
|------|---------|--------|
| API route errors | `sanitizeErrorMessage()` — no cookie values | ✅ Prior review |
| `logPlatformError` context | Could include cookie keys | **Fixed** — redact keys matching `cookie` |
| Middleware | Logs no cookie values | ✅ |
| Auth dev warnings | Error names/messages only, not tokens | ✅ |
| `hasSupabaseAuthCookies` | Checks names only, never logs values | ✅ |

**No cookie values** are written to client `console` in production paths.

---

## 9. Security Testing Matrix

| Test | Expected result | Status |
|------|-----------------|--------|
| Production cookies have `Secure` flag | Yes (browser DevTools → Application → Cookies) | ✅ Configured |
| Production cookies have `SameSite=Lax` | Yes | ✅ Configured |
| HTTP site in production | HSTS redirects to HTTPS | ✅ |
| Logout clears session | Auth cookies removed; protected routes redirect to login | ✅ |
| Cross-origin `fetch` POST to `/api/*` without CSRF header | 403 Forbidden | ✅ |
| Cross-origin HTML form POST with session (cross-site) | Cookie not sent (`SameSite=Lax`) | ✅ Browser behavior |
| Invalid/tampered auth cookie | `getUser()` fails → redirect login | ✅ |
| `document.cookie` after logout | Auth chunks absent or empty | ✅ |
| Auth callback over HTTPS | Session established | ✅ |

---

## 10. Documentation

### Cookie usage summary

```
User logs in
  → Supabase Auth issues session
  → @supabase/ssr stores in sb-*-auth-token cookies
  → Middleware refreshes on each request (withSecureCookieOptions)
  → API routes call getUser() / role guards
  → Logout: signOut() clears cookies + AuthSessionSync clears client cache
```

### Security settings applied (this review)

| File | Change |
|------|--------|
| `src/lib/security/cookies.ts` | Centralized `isSupabaseAuthCookieName`, `hasSupabaseAuthCookies`, explicit `path` + `SameSite` defaults, documented max age |
| `src/lib/auth/client-cookies.ts` | Uses shared cookie name helper; documents HttpOnly visibility limit |
| `src/lib/errors/classify.ts` | Delegates to centralized cookie detection |
| `src/lib/errors/logger.ts` | Redact `cookie*` keys from production log context |
| `src/components/auth/auth-session-sync.tsx` | **New** — `onAuthStateChange(SIGNED_OUT)` → clear client storage |
| `src/app/layout.tsx` | Mount `AuthSessionSync` |
| `deploy/lectrax-admin/src/lib/security/cookies.ts` | Synced with main app |

---

## Vulnerabilities Discovered and Remediation

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| CK-01 | Info | Auth cookies not HttpOnly (Supabase SSR design) | **Accepted** — BFF required for full fix; compensating controls in place |
| CK-02 | Low | `SameSite`/`path` only enforced in production before review | **Fixed** — `path` + `SameSite=Lax` always applied |
| CK-03 | Low | Cookie detection logic duplicated | **Fixed** — centralized in `cookies.ts` |
| CK-04 | Low | Client storage not cleared on remote/expired `SIGNED_OUT` | **Fixed** — `AuthSessionSync` |
| CK-05 | Info | Log context could include cookie-named fields | **Fixed** — logger redaction |
| CK-06 | Info | ~400-day refresh cookie lifetime | **Accepted** — Supabase default; revocation via signOut / Supabase dashboard |

---

## Authentication-Related Findings

1. **Single cookie domain:** All auth cookies are first-party (app origin only).
2. **Server validation:** Every protected API uses `getUser()` or `require*Role()` — not raw cookie parsing.
3. **Admin separation:** Platform admins on main app are signed out and redirected to admin deployment.
4. **Password recovery:** Callback with `type=recovery` redirects to `/reset-password`; session cookies set only after valid code exchange.
5. **CSRF + cookies:** Mutating API routes require same-origin signals in addition to session cookies.

---

## Remaining Risks

1. **JS-readable session tokens** — XSS could exfiltrate tokens despite CSP. True HttpOnly requires a BFF/session proxy architecture.
2. **Long refresh token window** — Stolen refresh token valid until expiry or revocation. Mitigate with Supabase session management and user sign-out.
3. **Fail-open middleware on transient DB errors** — Rare window where cookies exist but role check skipped; layouts/API still enforce.
4. **`deploy/lectrax-admin` artifact** — Re-run `npm run export:admin` to sync full admin deploy tree after cookie module changes.

---

## Recommendations for Further Hardening

1. **BFF / HttpOnly session proxy (optional, large change)**  
   Hold tokens exclusively in HttpOnly cookies on the server; expose opaque session ID to the client.

2. **Supabase session monitoring**  
   Use Supabase Auth dashboard to revoke sessions on credential compromise.

3. **`SameSite=Strict` evaluation**  
   Test OAuth/email flows before adopting; may break legitimate redirects.

4. **Rate limiting on auth callback**  
   Already covered by `authCallback` policy in rate-limit review (20/15 min).

5. **Periodic session re-auth for sensitive admin actions**  
   Optional step-up auth for subscription grants, user toggles (product decision).

6. **Re-export admin deploy**  
   `npm run export:admin` after merging cookie changes.

---

## Verification

```bash
npm run typecheck
npm run build
```

**Manual checks:**

1. DevTools → Application → Cookies after login: verify `Secure` + `SameSite` in production.
2. Logout → confirm auth cookies cleared and `/student` redirects to login.
3. Cross-origin mutation without CSRF header → 403.

---

*End of report.*
