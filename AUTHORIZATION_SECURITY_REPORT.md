# Authorization Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase)  
**Date:** June 18, 2026  
**Scope:** RBAC, route/API authorization, data access boundaries, privilege escalation, Supabase RLS alignment  
**Constraint:** No UI/UX/business-logic changes except security fixes

---

## Executive Summary

Lectrax implements **three application roles**: `student`, `lecturer`, and `platform_admin`. **HOD and Dean are not RBAC roles** in this codebase — they appear only as free-text fields on partnership inquiry forms.

Authorization is enforced in **four layers**: middleware route prefixes, role layouts, API route guards, and Supabase Row Level Security (RLS). The review found **no critical cross-user IDOR** (students accessing other students’ records, lecturers accessing other lecturers’ sessions). Several **medium-severity gaps** were fixed: premium audit-log API bypass, manual attendance enrollment validation, profile role fallback, and missing explicit student role checks on some APIs.

**Apply migration `043_manual_attendance_enrollment_check.sql`** (and `042` if not yet applied) to production Supabase.

---

## Roles & Access Model

| Role | Portal | Primary data scope |
|------|--------|-------------------|
| **Student** | `/student/*` | Own enrollments, submissions, grades, attendance, notifications |
| **Lecturer** | `/lecturer/*` | Own class sessions, students enrolled therein, attendance, assignments, tests |
| **Platform Admin** | `/admin/*` (or separate admin deploy) | Platform-wide lecturer/student management, inquiries, subscriptions, branding |

**Not in scope:** HOD, Dean, department-level admin — not implemented as roles. If required, they would need new enum values, RLS policies, and route guards.

---

## Files Reviewed

### Route & layout guards
- `src/middleware.ts`, `src/lib/supabase/middleware.ts`
- `src/lib/auth/require-role-layout.ts`, `require-page-user.ts`, `require-api-role.ts` (new)
- `src/lib/auth/roles.ts`, `get-role.ts`, `get-profile.ts`
- `src/lib/admin/require-platform-admin.ts`
- `src/app/student/layout.tsx`, `lecturer/layout.tsx`, `admin/layout.tsx`
- `src/lib/constants.ts` — `PUBLIC_ROUTES`, `ROLE_ROUTES`

### API routes (47 handlers)
- All `src/app/api/admin/**`
- All `src/app/api/lecturer/**`
- All `src/app/api/student/**`
- All `src/app/api/attendance/**`
- `payments/*`, `profile`, `auth/role`, `contact`, `partnerships/inquiry`, `webhooks/monime`, `cron/subscription-lifecycle`

### Server data access
- `src/lib/lecturer/class-sessions.ts`, `class-assignments.ts`, `class-tests.ts`
- `src/lib/attendance/sessions.ts`
- `src/lib/student/assignment-queries.ts`, `academic-overview.ts`
- `src/lib/subscription/guards.ts`
- `src/lib/session-data.ts`, `src/lib/audit.ts`

### Supabase RLS
- `supabase/migrations/001_initial_schema.sql` (baseline policies)
- `supabase/migrations/008_fix_profiles_rls_recursion_v2.sql`
- `supabase/migrations/029_enforce_assignment_submission_deadline.sql`
- `supabase/migrations/042_auth_role_hardening.sql`
- `supabase/migrations/043_manual_attendance_enrollment_check.sql` (new)

### Frontend authorization (UI gates)
- `src/app/lecturer/sessions/[id]/page.tsx` — premium audit tab
- `src/components/lecturer/session-page-client.tsx`
- Subscription-gated features across lecturer/student components

### Prior work referenced
- `AUTHENTICATION_SECURITY_REPORT.md` — metadata role trust, `requirePlatformAdmin`, migration 042

---

## Authorization Vulnerabilities Discovered

| Severity | Issue | Status |
|----------|-------|--------|
| **Medium** | Free lecturers could delete audit logs via API despite UI paywall | **Fixed** — `requirePremiumFeature("audit_logs")` on DELETE routes |
| **Medium** | Audit log data sent to client HTML even when premium tab hidden | **Fixed** — server omits audit rows when not premium |
| **Medium** | Manual attendance allowed `enrollmentId` from another class (same lecturer) | **Fixed** — API + RLS enrollment linkage |
| **Medium** | Profile PATCH could set `lecturer` role from signup metadata on missing row | **Fixed** — defaults to `student` only |
| **Low** | Student APIs relied on enrollment/RLS without explicit `role === student` | **Fixed** — `requireStudentRole()` on key routes |
| **Low** | Middleware fail-open on transient DB errors with valid cookies | **Documented** — layouts/API provide second layer |
| **Low** | `audit_logs` INSERT policy allows any authenticated user | **Documented** |
| **Info** | `deploy/lectrax-admin` may lag main app guards | **Documented** — re-run `npm run export:admin` |
| **Info** | No HOD/Dean roles | **N/A** — product scope |

**No critical IDOR found** for cross-user or cross-lecturer data access in reviewed routes.

---

## Privilege Escalation Testing

| Attack vector | Result |
|---------------|--------|
| Student URL → `/admin` or `/lecturer` | Redirected to correct role home |
| Lecturer URL → `/student` | Redirected |
| Change session UUID in `/lecturer/sessions/[id]` | `getClassSessionForLecturer` → 404 |
| Change `assignmentId` in student submit API | Blocked without enrollment |
| Change `student_id` in submission query | RLS + `.eq("student_id", user.id)` |
| `signUp` with `platform_admin` metadata | Blocked by migration 042 |
| Self-update `profiles.role` | Blocked by migration 042 trigger |
| Spoof `user_metadata.role` | Ignored for authorization (auth review) |
| Free lecturer DELETE audit logs | **Was possible** → **Fixed** |
| Manual attendance with foreign enrollment ID | **Was possible** (same lecturer) → **Fixed** |

---

## Page-Level Authorization

| Check | Implementation | Result |
|-------|----------------|--------|
| Unauthenticated access to portals | Middleware redirect → `/login` | ✅ |
| Wrong role prefix | Middleware redirect → role home | ✅ |
| Direct URL to session detail | `getClassSessionForLecturer` + `notFound()` | ✅ |
| Admin on main app | Signed out + redirect to admin login | ✅ |
| Platform admin split deploy | `admin-deployment.ts` | ✅ |

---

## Feature-Level Authorization

| Feature | UI gate | API gate | Notes |
|---------|---------|----------|-------|
| Audit logs tab | Premium subscription | **Now** `requirePremiumFeature` on DELETE | Fixed |
| Student PDF submissions | UI + lecturer premium | `requirePremiumFeature("student_submissions")` | ✅ |
| Assignment/test limits | Disabled buttons | `checkFreePlanLimit` | ✅ |
| Expired subscription read-only | Disabled mutations | `requireWritableSubscription` | ✅ |
| Analytics charts | Premium upsell | Server renders for all lecturers (same-user data) | Low risk — UI paywall only |

---

## API Authorization Summary

### Platform Admin (`/api/admin/*`)
- All routes use hardened `requirePlatformAdmin()` with service-backed `getRoleForUserSafe()`.

### Lecturer (`/api/lecturer/*`, `/api/attendance/*` lecturer ops)
- Pattern: auth → lecturer role → `getClassSessionForLecturer` / assignment/test helpers → mutation.
- Subscription guards on writes (`requireWritableSubscription`, `checkFreePlanLimit`, `requirePremiumFeature`).

### Student (`/api/student/*`, `attendance/scan`)
- Pattern: **`requireStudentRole()`** (new) → enrollment or `student_id` scoping.
- Join/notifications already had explicit student checks; submit/download/deadline-status/scan now aligned.

### Payments
- Scoped by `lecturer_id = user.id`; checkout requires lecturer role.

---

## Data Access Review

### Students
- Submissions, downloads, grades: scoped to `student_id = auth.user.id` + enrollment in class.
- Notifications: `student_id = user.id`.
- Academic overview page: rejects `user.id !== studentId`.
- **Cannot** access another student’s records via ID manipulation (verified).

### Lecturers
- All session-scoped operations verify `lecturer_id` on `class_sessions` or child resources.
- Student table rows built only for sessions owned by lecturer.
- **Cannot** access another lecturer’s sessions via UUID change (verified).

### Platform Administrators
- Full platform management via admin APIs + RLS admin policies.
- Provisioned manually (`supabase/scripts/create_platform_admin.sql`), not via signup.

### HODs / Deans
- **Not implemented** as authorization roles. Partnership forms collect `position_role` as text only.

---

## Supabase RLS Alignment

| Table | Frontend expectation | RLS backing |
|-------|---------------------|-------------|
| `profiles` | Own profile read/update | ✅ + role immutability trigger (042) |
| `class_sessions` | Lecturer owns sessions | ✅ |
| `enrollments` | Student join; lecturer manage | ✅ |
| `attendance_records` | Student scan; lecturer manual | ✅ + enrollment check (043) |
| `assignments` / `submissions` | Role-scoped CRUD | ✅ + deadline triggers |
| `payments` | Lecturer own; admin read all | ✅ |

Service role client is used **after** auth/ownership checks for privileged writes — appropriate pattern.

---

## Security Improvements Applied

### 1. API role helpers — `src/lib/auth/require-api-role.ts`
- `requireStudentRole()` and `requireLecturerRole()` use `getRoleForUserSafe()` with service client (same pattern as `requirePlatformAdmin`).

### 2. Student route hardening
- `requireStudentRole()` added to:
  - `student/assignments/[assignmentId]/submit`
  - `student/assignments/[assignmentId]/download`
  - `student/assignments/[assignmentId]/deadline-status`
  - `attendance/scan`

### 3. Premium audit log enforcement
- `requirePremiumFeature(userId, "audit_logs")` on:
  - `DELETE /api/lecturer/sessions/[id]/audit-logs`
  - `DELETE /api/lecturer/sessions/[id]/audit-logs/[logId]`
- Session detail page omits audit log payload when subscription is not premium.

### 4. Manual attendance enrollment validation
- API validates `enrollmentId` belongs to `classSessionId` before insert/delete.
- Migration `043` tightens RLS INSERT policy accordingly.

### 5. Profile role on create
- `/api/profile` PATCH: new profiles default to `student` only — no metadata-based `lecturer` assignment.

---

## Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Middleware fail-open on DB outage | Low | Consider fail-closed for non-public routes |
| `audit_logs` open INSERT for authenticated users | Low | Restrict to service role or verified actors |
| Analytics data loaded for free lecturers | Low | Acceptable — same-user data; UI gates charts |
| `deploy/lectrax-admin` stale guards | Medium if deployed | Re-export admin app |
| Migrations 042/043 not applied in prod | High | Apply to Supabase |
| No HOD/Dean RBAC | Info | Implement if product requires |

---

## Recommendations

1. **Apply migrations** `042` and `043` to production Supabase immediately.
2. **Audit existing `platform_admin` profiles** for unauthorized rows.
3. **Re-sync admin deploy** via `npm run export:admin` after security changes.
4. **Add `requireLecturerRole()`** to remaining lecturer routes that still use inline profile checks (consistency).
5. **Tighten `audit_logs` INSERT policy** to service-role or role-verified paths only.
6. **Rate-limit** admin and mutation APIs at the edge.
7. **Expand audit logging** for authorization failures (403/404 patterns).
8. **If HOD/Dean roles are needed**, design as scoped admin with department/faculty FK and new RLS — do not overload `platform_admin`.

---

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |

---

## Summary

Lectrax authorization is **well-structured** with defense-in-depth across middleware, layouts, API ownership checks, and Supabase RLS. The review closed gaps where **UI-only restrictions** (audit logs) or **incomplete validation** (manual attendance enrollments) could be bypassed. Student and lecturer data boundaries are **correctly enforced** against IDOR. HOD/Dean access boundaries are **not applicable** to the current role model. All fixes preserve existing workflows and user experience.
