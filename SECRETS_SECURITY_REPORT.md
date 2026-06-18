# Secrets & Credentials Security Audit Report

**Application:** Lectrax (Next.js 15 App Router)  
**Date:** June 18, 2026  
**Scope:** Frontend exposure of API keys, secrets, and sensitive credentials  
**Constraint:** No functional, UI, or business-logic changes — security hardening only

---

## Executive Summary

A full audit of the Lectrax codebase found **no hardcoded production secrets in git-tracked source files**. Private credentials (Supabase service role, Monime API/webhook keys, QR signing secret, cron secret) are correctly stored in server-only environment variables. The Supabase browser client uses only the public anon key.

Hardening was applied to **enforce server/client boundaries at build time**, **centralize public env access**, **disable production browser source maps**, and **add CI validation** to prevent accidental `NEXT_PUBLIC_*` misuse.

---

## Files Reviewed

### Environment & configuration
- `.env.example`, `deploy/lectrax-admin/.env.example`
- `.gitignore`
- `next.config.ts`
- `scripts/validate-env.mjs`
- `src/instrumentation.ts`

### Server-only secret modules
- `src/lib/env.ts`
- `src/lib/monime.ts`
- `src/lib/qr-token.ts`
- `src/lib/supabase/server.ts`
- `src/lib/subscription/payment-currency-server.ts` (new)
- All `src/app/api/**` routes (50+ handlers)

### Client / shared modules
- `src/lib/supabase/client.ts`
- `src/lib/env/public.ts` (new)
- `src/lib/subscription/payment-currency.ts`
- `src/lib/api/client-fetch.ts`, `src/lib/api/fetch.ts`
- `src/lib/security/csrf.ts`, `cookies.ts`, `transport.ts`, `client-storage.ts`
- `src/components/admin/admin-site-logo-upload.tsx`
- `src/components/admin/admin-landing-hero-upload.tsx`
- `src/lib/landing/site-branding.ts`
- `src/middleware.ts`

### Auth & network
- `src/lib/auth/session.ts`, `admin-deployment.ts`
- `src/lib/errors/logger.ts`
- `src/components/lecturer/attendance-session-panel.tsx` (debug logging)
- `src/lib/attendance/qr-rotation.ts`, `src/components/student/qr-scanner.tsx` (URL tokens)

### Repository
- Git-tracked files matching `*.env*`, `*secret*`, `*key*`, `*credential*`
- JWT-shaped strings across the repo (only in local `.env.local`, which is gitignored)

---

## Secrets & Credentials Discovered

| Item | Location | Risk | Status |
|------|----------|------|--------|
| Supabase anon key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Expected** — public by design; protected by RLS | OK |
| Supabase service role key | `SUPABASE_SERVICE_ROLE_KEY` | **Critical if exposed** | Server-only; not in client bundle |
| Monime API key / webhook secret | `MONIME_API_KEY`, `MONIME_WEBHOOK_SECRET` | **Critical if exposed** | Server-only (`monime.ts`, API routes) |
| QR token signing secret | `QR_TOKEN_SECRET` | **High if exposed** | Server-only (`qr-token.ts`) |
| Cron secret | `CRON_SECRET` | **High if exposed** | Server-only (`/api/cron/subscription-lifecycle`) |
| Real secrets in `.env.local` | Local dev file | N/A | **Gitignored** — not committed |
| Placeholders in `.env.example` | Tracked template | None | OK |

**No hardcoded API keys, service role keys, or webhook secrets were found in committed source code.**

---

## Supabase Integration

| Check | Result |
|-------|--------|
| Browser client uses anon key only | ✅ `src/lib/supabase/client.ts` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service role never imported by client components | ✅ `createServiceClient()` in `server.ts` only |
| Privileged DB operations via API routes / server libs | ✅ All `createServiceClient()` usage is server-side |
| Middleware uses anon key for session refresh | ✅ `src/lib/supabase/middleware.ts` |

The Supabase anon key is intentionally public; security relies on Row Level Security policies in Supabase, not key concealment.

---

## Network Requests

| Check | Result |
|-------|--------|
| API keys in URL query strings | ✅ None found |
| Attendance QR `token` in URLs | ⚠️ By design — short-lived HMAC-signed attendance tokens, not API credentials |
| Payment IDs in URLs | ✅ Removed in prior storage-security work |
| Auth `payment` / `token` query params | ✅ Stripped on load (prior work) |
| Monime API key in request headers | ✅ Server-side only (`Authorization: Bearer`) |
| CSRF custom header on mutations | ✅ `X-Lectrax-Request: 1` via `appFetch` |

---

## Logging Review

| Location | Finding | Action |
|----------|---------|--------|
| `src/app/api/partnerships/inquiry/route.ts` | Log mentioned env var name `SUPABASE_SERVICE_ROLE_KEY` | **Fixed** — generic message |
| `src/components/lecturer/attendance-session-panel.tsx` | Dev-only `console.debug` for QR refresh | ✅ Logs expiry timestamps only, not token values |
| `src/lib/auth/session.ts` | Dev-only auth error warnings | ✅ No secrets in output |
| `src/lib/errors/logger.ts` | Production-safe error logging | ✅ Uses `sanitizeContext` |
| `src/lib/monime.ts` | No logging of API keys | OK |

No `console.log` statements exposing key values were found.

---

## Security Improvements Applied

### 1. Server-only module boundaries (`server-only` package)
Added `import "server-only"` to modules that must never ship to the browser:
- `src/lib/env.ts`
- `src/lib/supabase/server.ts`
- `src/lib/monime.ts`
- `src/lib/qr-token.ts`
- `src/lib/subscription/payment-currency-server.ts`

**Effect:** Accidental client imports now fail at build time instead of silently bundling server code.

### 2. Client-safe public env helper
**New:** `src/lib/env/public.ts` — centralizes `NEXT_PUBLIC_*` reads only.

**Updated consumers:**
- `src/lib/supabase/client.ts`
- `src/lib/landing/site-branding.ts`
- `src/components/admin/admin-site-logo-upload.tsx`
- `src/components/admin/admin-landing-hero-upload.tsx`

### 3. Split payment currency module
**Problem:** `payment-currency.ts` read `MONIME_CURRENCY` / `MONIME_AMOUNT_*` and was imported by client components. Next.js does not inline non-`NEXT_PUBLIC_` vars into client bundles, so this was not a key leak, but it blurred the server/client boundary.

**Fix:**
- `payment-currency.ts` — client-safe formatting and defaults only (no `process.env`)
- `payment-currency-server.ts` — `getMonimeCurrency()`, `getBillingChargeAmount()` (server-only)

### 4. Service role configuration check
**New:** `isServiceRoleConfigured()` in `env.ts` — boolean check without exposing the key value.

**Updated:** `src/app/api/partnerships/inquiry/route.ts` — no direct `process.env.SUPABASE_SERVICE_ROLE_KEY` access or env name in logs.

### 5. Production source maps disabled
**Updated:** `next.config.ts` → `productionBrowserSourceMaps: false`

**Effect:** Reduces risk of recovering inlined public env values or internal paths from deployed `.map` files.

### 6. Environment validation hardening
**Updated:** `scripts/validate-env.mjs`
- Rejects `NEXT_PUBLIC_*` variables matching forbidden patterns (`SERVICE_ROLE`, `API_KEY`, `WEBHOOK_SECRET`, etc.)
- Decodes JWT-shaped anon key and rejects if `role === "service_role"`

### 7. Documentation in `.env.example`
Added comments clarifying which variables are browser-exposed vs server-only.

---

## Remaining Risks & Recommendations

### Low — acceptable by design
1. **Supabase anon key in browser bundle** — Required for client auth. Mitigate with strict RLS and never grant elevated policies to `anon`.
2. **Attendance QR tokens in URLs** — Short-lived signed tokens for scanning flow. Rotate via `QR_REFRESH_INTERVAL`; do not confuse with API secrets.
3. **Dev-only debug logs** — Gated by `NODE_ENV === "development"`. Keep disabled in production builds.

### Medium — operational
4. **`.env.local` on developer machines** — Contains real secrets. Ensure it stays gitignored; use Vercel/host env vars in production. Consider a pre-commit secret scanner (e.g. gitleaks, trufflehog).
5. **`deploy/lectrax-admin/` export copy** — Stale mirror under `deploy/` still has the pre-split `payment-currency.ts`. Re-run `npm run export:admin` after security changes to sync, or treat `src/` as the source of truth.

### Recommendations for secure secret management
1. **Vercel / hosting:** Store all private keys in platform environment settings (not in repo). Use separate env scopes for preview vs production.
2. **Never use `NEXT_PUBLIC_` for secrets** — Run `npm run validate:env` in CI before deploy.
3. **Rotate keys** if `.env.local` was ever shared or committed accidentally.
4. **Supabase:** Audit RLS policies periodically; service role key should only exist on server runtime.
5. **Monime:** Webhook signature verification stays server-side (`verifyMonimeWebhookSignature`); do not expose webhook secret to clients.
6. **Optional:** Add `.env.production.local` and `*.pem` to `.gitignore` if not already covered (`.env*.local` already covers most cases).

---

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |
| Git-tracked secret files | ✅ Only `.env.example` templates |
| Client bundle service role key | ✅ Not present |
| Client imports of `env.ts` / `monime.ts` | ✅ Build fails if attempted (`server-only`) |

---

## Summary

Lectrax’s frontend architecture correctly keeps private credentials server-side. This audit added **defense-in-depth**: explicit `server-only` boundaries, a dedicated public env module, disabled production browser source maps, and automated validation to prevent future `NEXT_PUBLIC_*` misuse. **No application behavior, UI, or business logic was changed.**
