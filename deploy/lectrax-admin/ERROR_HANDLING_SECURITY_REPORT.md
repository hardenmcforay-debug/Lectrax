# Error Handling and Information Disclosure Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase, Vercel)  
**Date:** June 19, 2026  
**Scope:** Frontend error handling, API responses, auth errors, database errors, logging, error boundaries, file uploads  
**Constraint:** No UI/UX/business-logic changes except security hardening  
**Builds on:** `API_ENDPOINT_SECURITY_REPORT.md`, `AUTHENTICATION_SECURITY_REPORT.md`, `BROWSER_STORAGE_SECURITY_REPORT.md`, `FILE_UPLOAD_SECURITY_REPORT.md`

---

## Executive Summary

Lectrax already had a **centralized error platform** (`sanitizeErrorMessage`, `mapAuthError`, `PlatformErrorBoundary`, `global-error.tsx`, `platformFetch` / `appFetch`) introduced and expanded in prior security reviews. This audit **re-reviewed all 59 API routes**, auth flows, upload paths, server/client logging, and error boundaries.

**No critical information disclosure** to end users was found in normal flows. Gaps addressed in this review:

1. **Expanded `sanitizeErrorMessage` denylist** — storage paths, RLS, constraints, tokens, env var names, file paths  
2. **Auth error passthrough** — `mapAuthError` now sanitizes credential messages  
3. **Uncaught API routes** — try/catch + `handleApiRouteError` on student-rows, export, subscription sync  
4. **Admin subscription mutations** — PATCH/DELETE lifecycle errors sanitized  
5. **Production client logging** — `logClientCrash` omits raw messages in production; server pages log details only in development  
6. **Server API logging** — `logServerError` wrapper for contact/partnership notification failures  
7. **Export button** — user-facing errors sanitized; dev-only `console.error`

---

## 1. Application-Wide Error Architecture

### Central modules

| Module | Role |
|--------|------|
| `src/lib/errors/classify.ts` | `sanitizeErrorMessage`, transient/auth classification, API response mapping |
| `src/lib/errors/map-auth-error.ts` | Login/signup/reset user-safe auth messages |
| `src/lib/errors/messages.ts` | Standard titles/descriptions per error category |
| `src/lib/errors/api.ts` | `apiErrorResponse`, `handleApiRouteError` for route handlers |
| `src/lib/errors/logger.ts` | `logPlatformError`, `logClientCrash`, `logServerError` |
| `src/lib/api/fetch.ts` | `platformFetch` — sanitizes API body errors |
| `src/lib/api/client-fetch.ts` | `appFetch` — CSRF + credentials for mutations |

### Frontend error surfaces

| Surface | Behavior | Disclosure risk |
|---------|----------|-----------------|
| `PlatformErrorBoundary` | Generic `ErrorFallback` — no stack shown | **Low** |
| `global-error.tsx` | "Something Went Wrong" + retry/reload | **Low** |
| `segment-error.tsx` | Scoped recovery UI | **Low** |
| `PlatformErrorProvider` | Toast/dialog from classified errors | **Low** — uses `userMessage` |
| Auth forms | `mapAuthError` / `mapSupabaseAuthError` | **Low** — enumeration-resistant signup |
| Client components | Most use `sanitizeErrorMessage` on API errors | **Low** |

### Middleware / infrastructure

| Layer | Error behavior |
|-------|----------------|
| Missing Supabase env (production) | Generic 503 JSON — no env details |
| CSRF violation | `{ error: "Forbidden" }` — 403 |
| Rate limit | `{ error: "Too many requests..." }` — 429 |
| Body too large | 413 with generic message |

---

## 2. API Error Handling (59 routes)

### Sanitization coverage

| Category | Routes | Sanitization |
|----------|--------|--------------|
| Attendance (scan, manual, start, end, refresh, device) | 8 | `sanitizeErrorMessage` on DB/RPC failures |
| Lecturer sessions, assignments, tests, grades, CA | 22 | Sanitized + static validation messages |
| Student join, notifications, assignments | 7 | Sanitized |
| Admin (contact, partnerships, subscriptions, branding) | 12 | Sanitized or static generic 500s |
| Payments | 4 | Sanitized; business messages intentional |
| Public (contact, partnerships inquiry) | 2 | Generic 500; Zod user messages only |
| Webhooks / cron | 2 | Machine auth; minimal client exposure |
| Auth role, server-time | 2 | No sensitive errors |

### Intentionally static messages (safe)

- `401` → "Not authenticated" / "Unauthorized"
- `403` → Role-specific ("Only lecturers can…") — no internal IDs leaked
- `404` → "Not found" / resource labels — no stack traces
- Validation → Zod custom messages or "Invalid request body"

### Fixes applied this review

| Route | Issue | Fix |
|-------|-------|-----|
| `GET .../student-rows` | Uncaught `getStudentTableRows` throw → Next.js 500 page | `handleApiRouteError` |
| `POST .../export-student-performance` | Uncaught workbook generation errors | `handleApiRouteError` |
| `POST .../subscription/sync` | Uncaught backfill errors | `handleApiRouteError` |
| `PATCH/DELETE /api/admin/subscriptions` | Lifecycle throws with raw DB text | try/catch + `sanitizeErrorMessage` |

---

## 3. Information Disclosure Prevention

### `sanitizeErrorMessage` blocked patterns (expanded)

| Category | Examples blocked |
|----------|------------------|
| Infrastructure | `supabase`, `postgres`, `postgrest`, `pgrst`, `sql` |
| Auth internals | `jwt`, `access_token`, `refresh_token`, `bearer` |
| Secrets | `api_key`, `secret`, `SERVICE_ROLE`, `MONIME_`, `CRON_SECRET`, `QR_TOKEN` |
| Storage | `storage`, `bucket` |
| Database schema | `constraint`, `violates`, `duplicate key`, `relation "`, `column "`, `rls` |
| Debugging | `stack trace`, `at function (`, long messages (>180 chars) |
| Paths | Windows `C:\`, Unix `/var/`, `/home/` |
| Network | `ECONNREFUSED`, `failed to fetch` → user-friendly network message |

### Not exposed to users (verified)

- Stack traces in API JSON or UI
- Supabase/Postgres error codes in client responses (sanitized)
- Storage object paths on upload failure
- Service role keys / webhook secrets
- Environment variable names in errors
- SQL query text

---

## 4. Authentication and Authorization Errors

| Scenario | User sees | Internal detail |
|----------|-----------|-----------------|
| Invalid login | "Sign in failed. Please check your email and password." | Logged via `logPlatformError` in dev-rich mode |
| Signup duplicate | Enumeration-resistant message | No "user exists" confirmation |
| Session expired | Redirect to `/login` | Middleware — no token details |
| Wrong role on route | Redirect to role home or login `?error=auth` | No role from cookie trusted |
| API 401/403 | Static role/auth messages | No JWT payload returned |
| Password reset | Sanitized Supabase errors | No account enumeration on forgot-password |

**Improvement:** `mapAuthError` now runs all credential messages through `sanitizeErrorMessage`.

---

## 5. Database Error Handling

| Path | Handling |
|------|----------|
| API routes | Raw `error.message` from Supabase → `sanitizeErrorMessage` before JSON |
| Server Components | Graceful fallbacks (empty rows, null hero image); dev-only server logs |
| `subscription/lifecycle.ts` | Throws with embedded DB messages — **caught** at admin API boundary and sanitized |
| RLS denials | Often appear as empty results or generic "not found" — not raw RLS text |

---

## 6. File Upload Error Handling

| Upload | Error handling |
|--------|----------------|
| Assignment PDF | Validation messages static; storage errors sanitized; scan rejections logged with reason code only |
| Admin logo/hero | `sanitizeErrorMessage` on Supabase storage/settings errors |
| Client upload UI | `sanitizeErrorMessage` on API response |

No storage paths or bucket names reach the client.

---

## 7. Logging Review

### Client-side (browser)

| Location | Production behavior |
|----------|---------------------|
| `logClientCrash` | Logs error **name** only — not message |
| `global-error.tsx` | Uses `logClientCrash` |
| `PlatformErrorBoundary` | Uses `logClientCrash` |
| Attendance QR debug | **Development only** (`NODE_ENV === "development"`) |
| Export button | `console.error` **development only** |
| Auth session warnings | **Development only** in `session.ts` |

### Server-side (API / SSR)

| Location | Behavior |
|----------|----------|
| `logPlatformError` | Sanitized context; redacts secret/token/cookie keys |
| `logServerError` | Wrapper for API route failures |
| Contact/partnership routes | Migrated from raw `console.error(error)` to `logServerError` |
| SSR pages (session, home, grades) | `console.error` **development only** |
| Rate limit | Logs scope + IP only |

### Server logs (Vercel)

Detailed errors may still appear in **server logs** for operations debugging — not sent to browsers. Recommend log drain retention policies in production.

---

## 8. Error Boundaries and Recovery

| Component | Recovery options |
|-----------|------------------|
| `PlatformErrorBoundary` (root + segments) | Retry, go back, reload |
| `global-error.tsx` | Try again, reload page |
| `segment-error.tsx` | Scoped retry |
| Session page partial failure | Empty student rows fallback — page still renders |
| Offline / network | `classifyFetchFailure`, platform error toasts |

No stack traces or digest details shown in UI.

---

## 9. Security Testing Matrix

| Test | Expected | Status |
|------|----------|--------|
| Trigger Supabase RLS failure via API | Generic error JSON | ✅ Sanitized |
| POST invalid JSON to API | "Invalid request body" | ✅ |
| 401 without session | "Not authenticated" | ✅ |
| Wrong role on lecturer API | 403 static message | ✅ |
| Upload oversized PDF | Size limit message | ✅ |
| Invalid login | No "user not found" vs "bad password" distinction | ✅ |
| Network offline | Offline / connection messages | ✅ |
| Force React render error | Error boundary fallback — no stack in UI | ✅ |
| Tamper cookie + API call | 401 or 403 — no session internals | ✅ |
| Export with corrupt payload | Safe API error (after fix) | ✅ Fixed |

---

## 10. Monitoring and Reporting Recommendations

| Event | Monitor via |
|-------|-------------|
| 5xx rate on `/api/*` | Vercel analytics / log drain |
| Rate-limit warnings `[rate-limit]` | Log aggregation |
| `assignment_submission_rejected` audit | Supabase `audit_logs` |
| Auth callback failures | Supabase Auth dashboard |
| Payment webhook failures | Monime dashboard + server logs |
| Cron lifecycle failures | Cron endpoint 401/500 alerts |

**Recommended:** Sentry or similar with `beforeSend` scrubbing for PII/tokens — not implemented (optional).

---

## Vulnerabilities Discovered and Remediation

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| EH-01 | Medium | `sanitizeErrorMessage` missed storage/RLS/constraint patterns | **Fixed** — expanded denylist |
| EH-02 | Medium | `mapAuthError` passed through raw messages ≤180 chars | **Fixed** — uses `sanitizeErrorMessage` |
| EH-03 | Medium | Uncaught errors on student-rows, export, subscription sync | **Fixed** — `handleApiRouteError` |
| EH-04 | Low | Admin subscription PATCH/DELETE uncaught lifecycle throws | **Fixed** |
| EH-05 | Low | `logClientCrash` logged full error.message in production | **Fixed** |
| EH-06 | Low | Export button showed raw `err.message` | **Fixed** |
| EH-07 | Info | SSR `console.error` with full errors | **Mitigated** — dev-only on key pages |
| EH-08 | Info | API routes log raw errors server-side | **Accepted** — ops logs; use `logServerError` |
| EH-09 | Info | Zod validation messages returned directly | **Accepted** — user-authored schema messages only |

---

## Security Improvements Applied (this review)

| File | Change |
|------|--------|
| `src/lib/errors/classify.ts` | Expanded `sanitizeErrorMessage` patterns |
| `src/lib/errors/map-auth-error.ts` | Sanitize credential messages |
| `src/lib/errors/logger.ts` | Production-safe `logClientCrash`; `logServerError` |
| `src/app/api/admin/subscriptions/route.ts` | try/catch PATCH/DELETE |
| `src/app/api/lecturer/subscription/sync/route.ts` | `handleApiRouteError` |
| `src/app/api/lecturer/sessions/[id]/student-rows/route.ts` | `handleApiRouteError` |
| `src/app/api/lecturer/sessions/[id]/export-student-performance/route.ts` | `handleApiRouteError` |
| `src/app/api/contact/route.ts` | `logServerError` |
| `src/app/api/partnerships/inquiry/route.ts` | `logServerError` |
| `src/app/api/admin/contact/[id]/route.ts` | `logServerError` |
| `src/app/api/admin/partnerships/[id]/route.ts` | `logServerError` |
| `src/components/lecturer/student-performance-export-button.tsx` | Sanitize + dev-only log |
| `src/app/layout.tsx`, `page.tsx`, session/grades pages | Dev-only server logging |

---

## Remaining Risks

1. **Next.js default 500 pages** — Unhandled errors outside try/catch may show generic Next error in dev; production shows generic page without stack (Next.js default).
2. **Server log visibility** — Vercel logs may contain sanitized-but-detailed `safeSerialize` output for operators.
3. **`handleApiRouteError` underuse** — Most routes manually sanitize; new routes should use helpers consistently.
4. **Zod `.message` in API** — Custom validation strings are trusted; avoid putting internal details in Zod schemas.
5. **No centralized error reporting SaaS** — Production crash correlation relies on Vercel logs.

---

## Files Reviewed

- All `src/app/api/**/route.ts` (59 handlers)
- `src/lib/errors/**`
- `src/lib/api/fetch.ts`, `client-fetch.ts`
- `src/lib/auth/map-auth-error.ts`, `session.ts`, `client-sign-out.ts`
- `src/lib/assignments/submissions.ts`
- `src/components/errors/**`
- `src/app/global-error.tsx`
- `src/components/auth/auth-form.tsx`, `reset-password/page.tsx`
- `src/middleware.ts`, `src/instrumentation.ts`
- Key lecturer/student/admin client components with error state

---

## Verification

```bash
npm run typecheck
npm run build
```

---

*End of report.*
