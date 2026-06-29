# Password Reset Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase Auth)  
**Date:** June 19, 2026  
**Scope:** Forgot-password flow, reset link handling, enumeration resistance, rate limiting, logging  
**Constraint:** No UI/UX/layout/styling changes; preserve existing workflows  
**Builds on:** `AUTHENTICATION_SECURITY_REPORT.md`, `RATE_LIMITING_SECURITY_REPORT.md`, `ERROR_HANDLING_SECURITY_REPORT.md`

---

## Executive Summary

The forgot-password flow previously called **Supabase Auth directly from the browser** (`resetPasswordForEmail`), which could send provider emails even when no Lectrax account existed and relied on Supabase’s default responses for error handling.

This review moved password-reset requests to a **server-side BFF route** that:

1. Validates email format (client + server)
2. **Looks up account existence internally** (service role → `profiles.email`)
3. Sends reset email **only when an account exists**
4. Returns the **same success message** for existing and non-existing emails
5. Applies **IP + per-email rate limits**
6. Uses **minimum response timing** to reduce timing probes
7. Logs outcomes server-side without exposing enumeration to users

The existing **recovery callback** (`/auth/callback?type=recovery` → `/reset-password`) and Supabase **time-limited, single-use** reset tokens are unchanged.

---

## Requirements Compliance

| # | Requirement | Status |
|---|-------------|--------|
| 1 | User enters email on Forgot Password page | **Met** — unchanged UI |
| 2 | Validate email format before submission | **Met** — `forgotPasswordSchema` (Zod) client + server |
| 3 | Internally check whether account exists | **Met** — service role `profiles` lookup |
| 4 | If exists, send reset via auth provider | **Met** — `resetPasswordForEmail` server-side |
| 5 | If not exists, no email, no revelation | **Met** — email skipped |
| 6 | Same success message both cases | **Met** — exact required copy |
| 7 | Prevent account enumeration | **Met** — uniform 200 response + message |
| 8 | Rate limiting | **Met** — 5/IP/15min + 3/email/15min |
| 9 | Secure, time-limited, single-use links | **Met** — Supabase Auth (unchanged) |
| 10 | No sensitive info in UI/API/logs/console | **Met** — `logServerError` server-only; audit uses outcome codes |
| 11 | Preserve design, layout, navigation, UX | **Met** — same page structure; success text updated per spec |

---

## Security Improvements Applied

### 1. Server-side forgot-password API

**`POST /api/auth/forgot-password`**

- Parses body with `forgotPasswordSchema`
- Checks `profiles.email` (normalized lowercase) via service client
- Calls `supabase.auth.resetPasswordForEmail` only when profile exists
- Always responds with `{ message: PASSWORD_RESET_SUCCESS_MESSAGE }` on success path
- Unhandled errors still return the same success message (fail-safe against enumeration)
- `400` only for invalid email format; `429` for rate limits

### 2. Enumeration-resistant messaging

**Constant:** `PASSWORD_RESET_SUCCESS_MESSAGE`

```
If an account exists with that email address, a password reset link has been sent. Please check your inbox.
```

Used identically by API and forgot-password success UI.

### 3. Rate limiting

| Policy | Scope | Limit |
|--------|-------|-------|
| `passwordReset` | IP (middleware) | 5 / 15 min |
| `passwordResetEmail` | SHA-256 hash of email (route) | 3 / 15 min |

### 4. Timing attack mitigation

- Minimum **450 ms** response time (`waitForMinimumResponseTime`) on all API completions via `finally` block
- Reduces reliability of timing probes comparing exist vs non-exist paths

### 5. Client hardening

- Forgot-password page uses **`appFetch`** (CSRF + credentials) instead of direct Supabase client
- Network errors mapped through `mapAuthError` with generic password-reset copy
- Rate limit (`429`) shows generic “too many attempts” message

### 6. Audit trail (server-only)

- `password_reset_requested` audit log with `outcome: "email_attempted" | "suppressed"`
- No email address stored in audit metadata; IP logged for abuse investigation

### 7. Existing recovery flow (unchanged)

- `redirectTo`: `/auth/callback?type=recovery`
- Callback exchanges code → session → redirects to `/reset-password`
- User sets new password; session cleared after update
- Supabase enforces link expiry and one-time use

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/auth/forgot-password/route.ts` | **New** — secure BFF handler |
| `src/lib/auth/password-reset.ts` | **New** — lookup, send, timing helpers |
| `src/lib/auth/password-reset-constants.ts` | **New** — shared success message |
| `src/app/(auth)/forgot-password/page.tsx` | Call API; exact success message |
| `src/lib/security/rate-limit-policies.ts` | `passwordReset`, `passwordResetEmail` policies |
| `src/lib/security/api-abuse.ts` | Middleware rule for forgot-password API |
| `src/lib/errors/map-auth-error.ts` | Generic password-reset error copy |

### Files reviewed (unchanged)

- `src/app/(auth)/reset-password/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/lib/validations.ts` (`forgotPasswordSchema`)
- `src/lib/security/csrf.ts`
- `src/middleware.ts`

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **profiles.email vs auth.users drift** | Low | All signups sync email via `handle_new_user` trigger; app does not allow email change in profile PATCH. If auth email is changed only in Supabase Dashboard, lookup could miss. |
| **Timing probes** | Low | 450 ms floor reduces but does not eliminate advanced timing analysis. |
| **Supabase Auth rate limits** | Low | Provider-level limits should be configured in Supabase Dashboard (documented in prior reports). |
| **Email delivery failure** | Low | Send failures are logged server-side; user still sees success message (by design, prevents enumeration). |
| **Role leakage** | None | Lookup does not read `profiles.role`; student/lecturer/admin indistinguishable to client. |
| **Stuck `processing` payments** | N/A | Unrelated to this flow. |

### Recommendations

1. **Supabase Dashboard** → Authentication → Rate Limits → enable password recovery throttling.
2. **Email templates** — confirm reset template uses HTTPS links and short expiry (Supabase default).
3. **Optional future** — `auth.users` RPC lookup if email change is added to the product.
4. **Optional future** — CAPTCHA on forgot-password after repeated 429s from same IP.

---

## Deployment Checklist

- [ ] Deploy application code
- [ ] Verify `POST /api/auth/forgot-password` returns 200 + uniform message for known and unknown emails
- [ ] Verify reset email arrives only for registered accounts
- [ ] Verify `429` after repeated requests from same IP/email
- [ ] Confirm Supabase redirect URL allowlist includes `/auth/callback`

---

*End of report.*
