# Authentication Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase Auth)  
**Date:** June 18, 2026  
**Scope:** Login, logout, signup, password flows, sessions, route protection, RBAC, auth logging  
**Constraint:** No functional/UI/business-logic changes except security fixes

---

## Executive Summary

Lectrax uses **Supabase SSR cookie sessions** with layered protection: middleware route guards, role layouts, API auth checks, CSRF on mutations, and secure cookie defaults. The review identified **three critical privilege-escalation vectors** (signup metadata → `platform_admin`, self-service `profiles.role` updates, client metadata trust) and **one broken password-recovery flow**.

Security fixes were applied in application code and a new database migration. **Apply migration `042_auth_role_hardening.sql` to production Supabase** to enforce role immutability at the database layer.

---

## Vulnerabilities Found

| Severity | Issue | Status |
|----------|-------|--------|
| **Critical** | Signup trigger allowed `platform_admin` from `raw_user_meta_data.role` | **Fixed** (migration `042`) |
| **Critical** | Users could `UPDATE` their own `profiles.role` via RLS | **Fixed** (migration `042` trigger) |
| **High** | Client/server role resolution trusted `user_metadata.role` (spoofable via `updateUser`) | **Fixed** (app code) |
| **High** | Admin API routes read role via user-scoped client (vulnerable if profile tampered) | **Fixed** (`requirePlatformAdmin` hardened) |
| **High** | Profile PATCH could create `platform_admin` profile from metadata | **Fixed** |
| **Medium** | Password recovery callback ignored `type=recovery`; no reset page | **Fixed** (`/reset-password`) |
| **Medium** | Signup revealed “account already exists” (user enumeration) | **Fixed** (generic message) |
| **Low** | Login password min 6 vs signup min 8 | **Documented** (no change — avoids locking out legacy accounts) |
| **Low** | Middleware fail-open on transient DB errors when cookies present | **Documented** |
| **Low** | Logged-in password change has no “current password” step | **Documented** |

---

## Security Improvements Applied

### 1. Database — `supabase/migrations/042_auth_role_hardening.sql`
- **`handle_new_user()`** — Only `lecturer` or `student` from signup metadata; never `platform_admin`.
- **`prevent_self_role_change()`** — `BEFORE UPDATE` trigger blocks non–service-role users from changing their own `profiles.role`.

### 2. Role resolution — metadata no longer used for authorization
- **`resolveUserRoleOrNull()`** — Returns role from `profiles` / RPC only; ignores `user_metadata`.
- **`resolve-client-role.ts`** — Removed metadata-first shortcut; uses profile then `/api/auth/role`.
- Affects: middleware, auth callback, `getRoleForUserSafe`, client post-login flow.

### 3. Admin API guards — service-backed role verification
- **`requirePlatformAdmin()`** — Uses `getCachedAuthUser()` + `getRoleForUserSafe()` with service client.
- Migrated routes: `toggle-lecturer`, `extend-subscription`, `grant-free`, `subscriptions`, `contact/[id]`, `partnerships/[id]`.

### 4. Profile API — safe role on create
- **`/api/profile` PATCH** — New profiles default to `lecturer` or `student` only; never `platform_admin` from metadata.

### 5. Password recovery flow
- **`/auth/callback`** — Redirects `type=recovery` to `/reset-password`.
- **`/reset-password`** — New page (matches forgot-password styling); 8-char validation; signs out after update.
- **`PUBLIC_ROUTES`** — Added `/reset-password`.
- Login shows confirmation when `?message=password-updated`.

### 6. User enumeration
- **`map-auth-error.ts`** — Signup “user already registered” → generic message matching forgot-password pattern.

---

## Files Reviewed

### Authentication flows
- `src/components/auth/auth-form.tsx` — Login, signup
- `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx` (new)
- `src/app/auth/callback/route.ts`
- `src/lib/auth/client-sign-out.ts`, `sync-signup-profile.ts`, `resolve-client-role.ts`
- `src/components/settings/profile-settings.tsx`

### Session & Supabase
- `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`
- `src/lib/auth/session.ts` — `getCachedAuthUser()` + `getUser()`
- `src/lib/security/cookies.ts`, `csrf.ts`, `client-storage.ts`
- `src/middleware.ts`

### Role & route protection
- `src/lib/auth/roles.ts`, `get-role.ts`, `require-role-layout.ts`, `require-page-user.ts`
- `src/lib/auth/admin-deployment.ts`
- `src/lib/constants.ts` — `PUBLIC_ROUTES`, `AUTH_ROUTES`, `ROLE_ROUTES`
- `src/app/student/layout.tsx`, `lecturer/layout.tsx`, `admin/layout.tsx`

### API authorization
- `src/app/api/auth/role/route.ts`
- `src/lib/admin/require-platform-admin.ts`
- All `src/app/api/admin/**` routes
- Representative `lecturer/*`, `student/*`, `attendance/*`, `payments/*` routes

### Validation & errors
- `src/lib/validations.ts` — `loginSchema`, `signupSchema`, `passwordChangeSchema`
- `src/lib/errors/map-auth-error.ts`, `auth-messages.ts`, `classify.ts`, `logger.ts`

### Database
- `supabase/migrations/003_fix_auth_signup_trigger.sql`
- `supabase/migrations/041_signup_college_id.sql`
- `supabase/migrations/042_auth_role_hardening.sql` (new)
- `supabase/migrations/008_fix_profiles_rls_recursion_v2.sql`

---

## Route Protection Findings

| Layer | Mechanism | Finding |
|-------|-----------|---------|
| **Middleware** | `getUser()` + `get_my_role` RPC + profile read | Enforces `/student`, `/lecturer`, `/admin` prefixes; redirects unauthenticated users |
| **Role layouts** | `requireRoleLayout()` + service-backed `getRoleForUserSafe` | Strong server-side guard for portal pages |
| **Auth routes** | Redirect signed-in users to role home | Prevents revisiting login while authenticated |
| **Admin split** | `admin-deployment.ts` | Platform admins blocked on main app; non-admins blocked on admin deploy |
| **API routes** | Per-route `getUser()` + role/ownership checks | Mostly consistent; admin routes now unified |
| **CSRF** | `rejectIfCsrfViolation` on mutating `/api/*` | Protects cookie-authenticated mutations |
| **Public routes** | `/`, marketing, `/auth/callback`, contact/partnership forms | Intentionally unauthenticated |

**Direct URL access:** Unauthorized users hitting `/lecturer/*`, `/student/*`, or `/admin/*` are redirected to login or their correct role home. URL manipulation of `redirect` param is constrained by `resolvePostLoginRedirect()` to same-role paths only.

---

## Session Management Findings

| Check | Result |
|-------|--------|
| Session storage | HttpOnly cookies via `@supabase/ssr` (not localStorage) |
| Cookie flags (prod) | `Secure`, `SameSite=Lax` via `withSecureCookieOptions` |
| Server validation | `getUser()` on server/middleware (JWT validated with Supabase) |
| Session refresh | Middleware `updateSession` refreshes tokens |
| Logout | `signOutAndClearClientStorage()` — Supabase signOut + offline cache + Zustand purge |
| Expired/invalid session | Redirect to `/login?redirect=...` or generic auth error |
| PWA gate | `getSession()` client-side for UX only; not used for authorization |

**Note:** On transient DB/RPC failures, middleware may allow the request through when auth cookies exist (availability trade-off). Role layouts and API checks provide a second layer.

---

## Authorization Findings (Student / Lecturer / Platform Admin)

| Role | Home | Protection |
|------|------|------------|
| **Student** | `/student` | Middleware prefix + `student/layout.tsx` |
| **Lecturer** | `/lecturer` | Middleware prefix + `lecturer/layout.tsx` + subscription guards |
| **Platform Admin** | `/admin` (or separate admin deploy) | Middleware + `admin/layout.tsx` + hardened `requirePlatformAdmin` |

**Privilege escalation mitigations:**
- Signup cannot assign `platform_admin` (DB + UI enum `lecturer|student` only).
- Self-service role change blocked (DB trigger after migration).
- Authorization reads `profiles.role` / `get_my_role` RPC, not client metadata.
- Admin operations verified via service-backed role resolution.

**Remaining:** Student API routes often rely on auth + RLS rather than explicit `role === 'student'` checks. RLS is the primary enforcement; explicit role checks are recommended as defense-in-depth (see recommendations).

---

## Password Security

| Area | Policy | Notes |
|------|--------|-------|
| Signup | Min 8 chars, max 128 | `passwordField(8)` |
| Password change (settings + reset) | Min 8 chars | Zod validated |
| Login form | Min 6 chars | **Unchanged** — validation only; Supabase enforces actual password |
| Storage | Never logged/cached | No password in console, localStorage, or URLs |
| Reset flow | Email link → callback → `/reset-password` | Signs out after successful update |

Passwords are handled only by Supabase Auth; the app never stores plaintext passwords.

---

## Security Logging Review

| Location | Finding |
|----------|---------|
| Auth forms | No password/token logging |
| `session.ts` | Dev-only warnings; error name/message only |
| `errors/logger.ts` | Redacts `secret`, `token`, `key`, `password` in production |
| Attendance debug | Dev-only; logs timestamps, not QR token values |

No remediation required for credential logging.

---

## Error Handling & Information Leakage

| Flow | Behavior |
|------|----------|
| Login failure | Generic “check email and password” |
| Signup duplicate email | Generic message (post-fix) |
| Forgot password | Always “check your email” on success |
| Auth callback failure | Redirect `/login?error=auth` |
| API 401/403 | Standard unauthorized/forbidden without stack traces |

---

## Security Testing (Manual / Code Review)

| Test case | Expected result | Result |
|-----------|-----------------|--------|
| Unauthenticated access to `/lecturer` | Redirect to login | ✅ Middleware |
| Student accessing `/admin` | Redirect to `/student` | ✅ Middleware |
| Lecturer accessing `/student` | Redirect to `/lecturer` | ✅ Middleware |
| `signUp` with `role: platform_admin` in metadata | Profile created as `student` (post-migration) | ✅ Migration |
| `updateUser({ data: { role: 'platform_admin' }})` | No authorization bypass | ✅ Metadata ignored |
| Direct `/api/admin/*` without admin role | 403 Forbidden | ✅ |
| Expired session cookie | Redirect to login | ✅ |
| Password reset email flow | Lands on `/reset-password` | ✅ (post-fix) |
| CSRF on POST `/api/*` without header | 403 | ✅ (prior CSRF work) |

---

## Remaining Risks & Recommendations

### Operational
1. **Apply migration `042`** to production Supabase immediately.
2. **Audit existing `profiles`** for any `platform_admin` rows not provisioned via `create_platform_admin.sql`; demote if fraudulent.
3. **Rotate service role key** if privilege escalation was ever attempted in production.

### Future improvements
4. **MFA** — Enable Supabase MFA for platform admins and optionally lecturers.
5. **Rate limiting** — Edge/API limits on login, signup, forgot-password (Supabase has some built-in; add app-level if needed).
6. **Login password min 8** — Align with signup after communicating to users (or force reset).
7. **Current-password verification** — Require re-auth before `updateUser({ password })` in settings.
8. **Explicit student role checks** — Add to `/api/student/*` routes for defense-in-depth.
9. **Middleware fail-closed option** — On role resolution failure with valid session, redirect to login instead of proceed.
10. **Audit logging** — Expand auth events (failed logins, role changes, admin actions) to `audit_logs` or external SIEM.
11. **Session monitoring** — Alert on concurrent sessions or impossible travel (Supabase / custom).
12. **Sync `deploy/lectrax-admin`** — Re-export after auth fixes if using separate admin deployment.

---

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass (59 routes including `/reset-password`) |

---

## Summary

Authentication architecture is sound (Supabase SSR + layered guards). The critical gaps were **trust in client-influenceable role metadata** and **database policies allowing self-promotion to admin**. Application fixes remove metadata from authorization paths and harden admin APIs; the database migration closes signup and self-update escalation vectors. Password recovery is now complete. **No UI redesign or business-logic changes** were made beyond these security corrections.
