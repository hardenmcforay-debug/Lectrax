# Lectrax CSRF Security Review

**Date:** June 18, 2026  
**Scope:** Cross-Site Request Forgery protection across the Lectrax frontend and same-origin `/api` routes  
**Constraint:** No functional, UI, or business-logic changes beyond CSRF hardening.

---

## 1. Executive Summary

Lectrax uses **cookie-based Supabase authentication** with same-origin Next.js API routes. Before this review, there was **no explicit CSRF validation** beyond implicit browser `SameSite` cookie behavior.

This review added **defense-in-depth CSRF protections**:
- Middleware validation for all mutating `/api/*` requests
- Custom anti-CSRF request header on client mutations
- Centralized `appFetch` / `platformFetch` wrappers with `credentials: 'include'`
- Documented cookie and cross-origin posture

---

## 2. Files Reviewed

### Authentication & session
| File | State-changing actions |
|------|------------------------|
| `src/components/auth/auth-form.tsx` | Login, signup (Supabase direct + device register POST) |
| `src/lib/auth/client-sign-out.ts` | Logout (Supabase `signOut`) |
| `src/components/settings/profile-settings.tsx` | Profile PATCH, password change (Supabase) |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server session cookies |
| `src/lib/supabase/middleware.ts` | Session refresh, cookie `Secure`/`SameSite` |
| `src/lib/security/cookies.ts` | Cookie security defaults |
| `src/middleware.ts` | Global request pipeline |

### Student portal
| File | Mutations |
|------|-----------|
| `src/app/student/join/page.tsx` | POST join class |
| `src/components/student/qr-scanner.tsx` | POST attendance scan, device transfer |
| `src/components/student/student-assignment-detail-client.tsx` | POST file upload |
| `src/components/student/student-notifications-provider.tsx` | POST mark-read |
| `src/components/student/attendance-device-registrar.tsx` | POST device register |

### Lecturer portal
| File | Mutations |
|------|-----------|
| `src/components/lecturer/create-session-form.tsx` | POST session |
| `src/components/lecturer/session-page-client.tsx` | DELETE session, POST manual student |
| `src/components/lecturer/ca-structure-panel.tsx` | PUT ca-config, POST/DELETE tests |
| `src/components/lecturer/attendance-session-panel.tsx` | POST start/end/refresh/manual attendance |
| `src/components/lecturer/assignment-grades-client.tsx` | POST grades |
| `src/components/lecturer/test-grades-client.tsx` | POST scores |
| `src/components/lecturer/payment-checkout-flow.tsx` | POST checkout (via `platformFetch`) |
| `src/components/lecturer/subscription-page-content.tsx` | POST sync, DELETE payments |
| `src/app/lecturer/sessions/.../create-assignment-form.tsx` | POST assignment |

### Admin portal
| File | Mutations |
|------|-----------|
| `src/components/admin/admin-actions.tsx` | POST grant-free, toggle, extend |
| `src/components/admin/admin-subscription-actions.tsx` | POST/PATCH/DELETE subscriptions |
| `src/components/admin/admin-contact-table.tsx` | PATCH/DELETE contact |
| `src/components/admin/admin-partnerships-table.tsx` | PATCH/DELETE partnerships |
| `src/components/admin/admin-site-logo-upload.tsx` | POST/DELETE logo |
| `src/components/admin/admin-landing-hero-upload.tsx` | POST/DELETE hero |

### Public forms
| File | Mutations |
|------|-----------|
| `src/components/contact/contact-form.tsx` | POST contact |
| `src/components/partnerships/partnership-inquiry-form.tsx` | POST partnership inquiry |

### API infrastructure
| File | Role |
|------|------|
| `src/lib/api/fetch.ts` | `platformFetch` — payments, retries |
| All `src/app/api/**/route.ts` (59 routes) | Server handlers |

### Exempt (non-browser / signed)
| Route | Protection |
|-------|------------|
| `/api/webhooks/monime` | HMAC signature verification |
| `/api/cron/subscription-lifecycle` | Bearer cron secret |

---

## 3. Potential CSRF Vulnerabilities Found

| Risk | Severity (before) | Description |
|------|-------------------|-------------|
| No Origin/`Sec-Fetch-Site` validation on `/api` mutations | **High** | Cross-site pages could trigger same-origin mutations if cookies were sent |
| Inconsistent `credentials` on fetch calls | **Medium** | Some requests omitted explicit `credentials: 'include'` |
| No custom CSRF header on mutations | **Medium** | Relied solely on `SameSite=Lax` cookies |
| Public POST endpoints (`/api/contact`, `/api/partnerships/inquiry`) | **Low–Medium** | Spam/forgery possible without session; cross-site HTML forms could POST without cookies |
| Supabase auth via `supabase.co` | **Info** | Out of app middleware scope; protected by Supabase CORS + PKCE/OAuth |
| Auth cookies readable by JS | **Info** | Supabase SSR design; `SameSite=Lax` limits cross-site cookie attachment on POST |

---

## 4. Security Improvements Applied

### A. Middleware CSRF gate (`src/lib/security/csrf.ts` + `src/middleware.ts`)

For every **POST, PUT, PATCH, DELETE** to `/api/*` (except webhooks/cron):

1. Reject `Sec-Fetch-Site: cross-site`
2. Reject `Origin` / `Referer` host mismatches
3. Accept requests with `X-Lectrax-Request: 1` header (custom header — cannot be set by cross-origin HTML forms)
4. Allow same-origin browser requests with matching Origin/Referer

Returns **403 Forbidden** on violation (generic message, no internal details).

### B. Client mutation wrapper (`src/lib/api/client-fetch.ts`)

New `appFetch()`:
- Adds `X-Lectrax-Request: 1` on mutating `/api/*` calls
- Sets `credentials: 'include'` for same-origin API routes
- Migrated **28 client files** from raw `fetch()` to `appFetch()`

### C. `platformFetch` hardening (`src/lib/api/fetch.ts`)

Payment and other `platformFetch` mutations now include CSRF headers and `credentials: 'include'` for `/api/*` URLs.

### D. Cookie security (verified + documented)

| Attribute | Production behavior |
|-----------|---------------------|
| `Secure` | ✅ via `withSecureCookieOptions()` (middleware + server) |
| `SameSite` | ✅ `Lax` default — blocks cross-site POST cookie attachment |
| `HttpOnly` | ⚠️ Supabase session chunks may be JS-readable (framework default) |

---

## 5. CSRF Protection Model

```
Browser mutation (POST/PUT/PATCH/DELETE)
    │
    ├─ appFetch / platformFetch
    │     └─ X-Lectrax-Request: 1
    │     └─ credentials: include
    │
    ▼
Next.js middleware (rejectIfCsrfViolation)
    ├─ Sec-Fetch-Site ≠ cross-site
    ├─ Origin/Referer matches Host
    └─ OR valid CSRF header
    │
    ▼
API route handler
    └─ Supabase auth.getUser() + role guards + RLS
```

**Login / logout / password change** via Supabase client go directly to `*.supabase.co` — not subject to Lectrax `/api` middleware; protected by Supabase's own CORS and auth flows.

---

## 6. Backend Requirements (for complete protection)

| Item | Status | Notes |
|------|--------|-------|
| Middleware Origin validation | ✅ Implemented | Covers all `/api` mutations centrally |
| Webhook HMAC | ✅ Pre-existing | `monime` webhook |
| Cron Bearer auth | ✅ Pre-existing | Subscription lifecycle cron |
| Public form rate limiting | ⏳ Recommended | Server-side throttle on `/api/contact` and `/api/partnerships/inquiry` |
| CAPTCHA on public forms | ⏳ Optional | Reduces automated CSRF spam |
| `SameSite=Strict` for auth cookies | ⏳ Evaluate | May break OAuth redirect flows; test before changing |
| HttpOnly-only session via BFF | ⏳ Optional | Architectural change; see browser storage report |

No additional frontend changes required for baseline CSRF protection.

---

## 7. Remaining Risks

| Risk | Severity | Mitigation in place |
|------|----------|---------------------|
| Cross-site **HTML form POST** to public APIs (no cookies needed) | Low | Origin middleware blocks cross-origin `fetch`; simple `<form action>` from another origin may still reach server — rate limiting recommended |
| Legacy browsers without `Sec-Fetch-Site` | Low | Origin/Referer + CSRF header fallback |
| Direct API testing without CSRF header in production | Low | Dev tools / curl need `Origin` or header; intentional for security |
| Supabase direct mutations from browser | Info | Governed by Supabase; not Lectrax `/api` |
| Monime external API calls | None (server-only) | API keys never exposed to browser |

---

## 8. Files Modified

| File | Change |
|------|--------|
| `src/lib/security/csrf.ts` | **New** — validation logic, header constants |
| `src/lib/api/client-fetch.ts` | **New** — `appFetch()` wrapper |
| `src/middleware.ts` | CSRF check before session update |
| `src/lib/api/fetch.ts` | CSRF headers on `platformFetch` mutations |
| `src/lib/security/cookies.ts` | CSRF-related documentation |
| 28 client components/pages | `fetch` → `appFetch` for `/api` calls |

---

## 9. Verification

- `npm run typecheck` — **passes**
- All existing features use same URLs, methods, and payloads
- No UI, routing, or business-logic changes
- Webhook and cron routes remain exempt

---

## 10. Testing Recommendations

1. **Happy path:** Login → profile update → attendance → grades → logout (all portals)
2. **Cross-site simulation:** Attempt `fetch('https://your-app/api/profile', { method: 'PATCH', credentials: 'include' })` from browser console on a different origin — should fail CORS/cookies
3. **Missing header:** POST to `/api/profile` without `X-Lectrax-Request` from same origin without Origin — should 403 in production
4. **Public forms:** Submit contact/partnership forms from app — should still work with `appFetch`
