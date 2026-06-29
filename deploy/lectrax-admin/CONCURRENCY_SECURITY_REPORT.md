# Concurrency, Race Condition, and System Resilience Review Report

**Application:** Lectrax (Next.js 15 + Supabase, Vercel)  
**Date:** June 19, 2026  
**Scope:** All create/update/delete/submission paths, attendance, grades, admin ops, payments, database integrity, Supabase interactions, high-traffic behavior, failure recovery  
**Constraint:** No UI/UX/business-logic changes except concurrency hardening  
**Builds on:** `RATE_LIMITING_SECURITY_REPORT.md`, `DDoS_SECURITY_REPORT.md`, `ERROR_HANDLING_SECURITY_REPORT.md`, `AUTHENTICATION_SECURITY_REPORT.md`, `AUTHORIZATION_SECURITY_REPORT.md`

---

## Executive Summary

Lectrax uses **API route handlers** (no Next.js server actions) with **Supabase Postgres** as the source of truth. Concurrency protection was **strongest on attendance** (unique constraints + `23505` handling + client guards) and **weakest on grades/CA** (last-write-wins upserts) and **payment activation** (status-check idempotency only).

This review audited **all mutation paths**, documented race risks, and implemented **production-grade hardening** without changing user workflows or UI:

1. **DB unique index** — one active attendance session per class + lecturer  
2. **Payment activation claims** — `processing` status + `FOR UPDATE` RPC to prevent double webhook/poll activation  
3. **Monime idempotency keys** — stable per `paymentId` on checkout/payment-code creation  
4. **`23505` race fallbacks** — attendance start, test creation, assignment submission insert, grade-only submission bootstrap  
5. **Grade/score save ordering** — upsert before delete to reduce cross-request data loss  
6. **Shared Postgres error helper** — `isUniqueViolation()` for consistent race handling  

**Remaining limitations** (documented in §12): multi-tab grade editing (last-write-wins), no optimistic locking on CA weights, checkout creates a new pending payment per click, no distributed transactions across storage + DB for assignment uploads.

---

## 1. Concurrency Audit

### Architecture

| Layer | Pattern |
|-------|---------|
| Mutations | `src/app/api/**/route.ts` (59 routes reviewed) |
| Auth writes | Supabase Auth + `profiles` upsert |
| Realtime | Supabase `postgres_changes` on `attendance_records` (lecturer panel) |
| Transactions | PL/pgSQL RPCs only (device transfer uses `FOR UPDATE`); app code uses multi-step calls |
| Idempotency | Unique indexes + pre-check + `23505` catch; payment claim RPC (new) |

### Create / update / delete surfaces reviewed

| Domain | Routes / libs | Duplicate risk | Conflict risk |
|--------|---------------|----------------|---------------|
| Attendance scan | `api/attendance/scan` | **Low** — `UNIQUE(session, enrollment)` + `23505` | Low |
| Attendance manual | `api/attendance/manual` | **Low** — same unique + `23505` | Low |
| Attendance start | `api/attendance/start` | **Medium → Low** — app check + **new DB unique** | Medium → Low |
| Attendance end/refresh | `api/attendance/end`, `refresh` | Low — idempotent close; atomic QR hash replace | Low |
| Student join | `api/student/join` | **Low** — `UNIQUE(class, student)` + `23505` | Low |
| Assignment submit | `api/student/.../submit`, `lib/assignments/submissions` | **Medium → Low** — pre-check + **new `23505` handler** | Medium |
| Assignment grades | `api/.../grades` | Low — one grade per submission | **High** — last-write-wins |
| Test scores | `api/.../scores` | Low — `UNIQUE(test, enrollment)` | **High** — last-write-wins |
| CA config | `api/.../ca-config` | Low — one row per class/semester/year | **Medium** — last-write-wins |
| Test creation | `api/.../tests` | **Medium → Low** — app check + **new `23505` → 409** | Low |
| Manual student | `api/.../students/manual` | Low — two-step insert with rollback | Low |
| Payments | checkout, webhook, status poll | **High → Medium** — **claim RPC** + Monime idempotency | Medium |
| Admin subscriptions | `api/admin/subscriptions` | Medium — check-then-insert + partial rollback | Medium |
| Admin branding | `api/admin/site-logo`, `landing-hero` | Low — `upsert onConflict key` | Low |
| Role changes | DB triggers only (`042_auth_role_hardening`) | **Low** — not exposed via API | Low |

### Race conditions discovered

| ID | Scenario | Severity | Status |
|----|----------|----------|--------|
| R1 | Concurrent `POST /attendance/start` creates two active sessions | High | **Fixed** — migration `044` unique partial index + `23505` → 409 |
| R2 | Concurrent QR scans for same student | Low | Already mitigated (`23505`) |
| R3 | Manual mark vs QR scan — first writer wins on `mark_method` | Medium | Accepted — business rule unchanged |
| R4 | Concurrent payment webhook + status poll double-activates subscription | High | **Fixed** — `claim_payment_for_activation` RPC |
| R5 | Concurrent assignment submission after pre-check passes | Medium | **Fixed** — `23505` → user-safe duplicate message + storage cleanup |
| R6 | Concurrent `ensureAssignmentSubmissionForGrading` insert | Medium | **Fixed** — `23505` → re-fetch existing row |
| R7 | Concurrent test creation bypassing app check | Medium | **Fixed** — `23505` → 409 |
| R8 | Grade save: delete then upsert — concurrent delete wipes peer upsert | Medium | **Mitigated** — upsert before delete |
| R9 | Two lecturer tabs saving different grades — silent overwrite | High | **Documented** — requires version field (future) |
| R10 | Monime API retry with new idempotency UUID creates duplicate provider resources | Medium | **Fixed** — stable key per `paymentId` |
| R11 | Device registration race — unique violation surfaces as generic error | Low | Documented |
| R12 | Session delete while grades in flight | Medium | Documented — cascade + 404 |

---

## 2. Attendance System Review

### QR attendance submissions (`api/attendance/scan`)

**Flow:** Validate token → check duplicate SELECT → device RPC → INSERT → catch `23505`.

**Protections:**
- `UNIQUE(attendance_session_id, enrollment_id)` (migration `001`)
- Pre-insert SELECT + `respondDuplicateAttendance` audit (`duplicate_attendance_scan_attempt`)
- Rate limits: 40/min IP, 25/min user (`attendanceScan`, `attendanceScanPerUser`)
- Client: `processedRef` in `qr-scanner.tsx` blocks in-flight double submit
- Device anti-sharing: partial unique indexes (`042_device_single_student_attendance`)

**Business rule:** One attendance record per student per attendance session — **enforced at DB**.

### Manual attendance (`api/attendance/manual`)

- Same unique constraint + `23505` → 409 `"Attendance Already Recorded"`
- Cannot DELETE `qr_scan` / `device_verified` rows (403)
- RLS enrollment check (migration `043`)
- Lecturer panel: optimistic add + 409 resync via `syncPresentRecords`

### Session lifecycle

| Operation | Concurrency control |
|-----------|---------------------|
| Start | App SELECT + **unique index** `idx_one_active_attendance_session_per_class` |
| End | Idempotent if already closed |
| Refresh QR | Atomic UPDATE replaces `qr_token_hash` — stale tokens rejected at scan time |

### Files reviewed

- `src/app/api/attendance/scan/route.ts`
- `src/app/api/attendance/manual/route.ts`
- `src/app/api/attendance/start/route.ts` (**updated**)
- `src/app/api/attendance/end/route.ts`
- `src/app/api/attendance/refresh/route.ts`
- `src/app/api/attendance/device/register/route.ts`
- `src/app/api/attendance/device/transfer/route.ts`
- `src/lib/attendance/present-records.ts`
- `src/components/student/qr-scanner.tsx`
- `src/components/lecturer/attendance-session-panel.tsx`
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/026_attendance_session_lifecycle.sql`
- `supabase/migrations/031_attendance_device_verification.sql`
- `supabase/migrations/042_device_single_student_attendance.sql`
- `supabase/migrations/043_manual_attendance_enrollment_check.sql`
- `supabase/migrations/044_concurrency_resilience.sql` (**new**)

---

## 3. CA and Grade Management Review

### Assignment grades (`PUT .../grades`)

- Pattern: dirty-diff client → batch `{ scores, deleteEnrollmentIds }`
- Server: ensure submission rows → **upsert grades** → **delete cleared grades** (reordered this review)
- `UNIQUE(assignment_submission_id)` on `assignment_grades`
- Client: `saving` flag disables Save All during request

**Conflict handling:** None — concurrent saves are **last-write-wins**. `graded_by` / `graded_at` reflect the last saver.

**Recommendation (future, no UI change required for server-only):** optional `expectedGradedAt` per row → 409 on mismatch.

### Test scores (`PUT .../scores`)

- Same batch pattern; `UNIQUE(class_test_id, enrollment_id)`
- **Upsert before delete** applied this review

### CA configuration (`PUT .../ca-config`)

- Single upsert on `(class_session_id, semester, academic_year)`
- Local draft in `ca-structure-panel.tsx`; server hit on explicit Save
- Concurrent saves: last-write-wins on weights

### Files reviewed

- `src/app/api/lecturer/sessions/[id]/assignments/[assignmentId]/grades/route.ts` (**updated**)
- `src/app/api/lecturer/sessions/[id]/tests/[testId]/scores/route.ts` (**updated**)
- `src/app/api/lecturer/sessions/[id]/ca-config/route.ts`
- `src/lib/lecturer/grade-entry.ts`
- `src/lib/lecturer/class-assignments.ts` (**updated**)
- `src/lib/ca-calculator.ts`
- `src/components/lecturer/assignment-grades-client.tsx`
- `src/components/lecturer/test-grades-client.tsx`
- `src/components/lecturer/ca-structure-panel.tsx`
- `supabase/migrations/018_assignment_submissions_grades.sql`
- `supabase/migrations/016_fix_test_scores_unique_for_test2.sql`

---

## 4. Administrative Operations Review

### Student management

- **Self-join:** `api/student/join` — `23505` → 409
- **Manual add:** `api/.../students/manual` — insert `manual_students` then `enrollments`; rollback manual row on enroll failure
- No per-student removal API

### Lecturer management

- **Toggle active:** `api/admin/toggle-lecturer` — blind `profiles.update`; reload UX
- Subscription guards block writes when expired

### Course / session management

- **Create session:** `api/lecturer/sessions` — `session_code` UNIQUE
- **Delete session:** cascade via `deleteClassSession`; in-flight writes may 404

### Role management

- Roles **not** mutable via API (`api/profile` PATCH excludes role)
- DB triggers: `prevent_self_role_change`, signup blocks `platform_admin` (`042_auth_role_hardening`)

### Admin subscriptions

- `adminActivatePremium` / extend / revoke — check-then-write; 409 on business-rule conflict
- Not fully transactional across `subscriptions` + `profiles`

### Files reviewed

- `src/app/api/admin/toggle-lecturer/route.ts`
- `src/app/api/admin/subscriptions/route.ts`
- `src/app/api/admin/grant-free/route.ts`
- `src/app/api/admin/extend-subscription/route.ts`
- `src/app/api/admin/contact/[id]/route.ts`
- `src/app/api/admin/partnerships/[id]/route.ts`
- `src/app/api/lecturer/sessions/route.ts`
- `src/app/api/lecturer/sessions/[id]/route.ts`
- `src/app/api/lecturer/sessions/[id]/students/manual/route.ts`
- `src/lib/subscription/lifecycle.ts` (**updated**)

---

## 5. Duplicate Request Protection

### Server-side

| Mechanism | Where |
|-----------|-------|
| Unique constraints | See §6 |
| Pre-check SELECT | Attendance, assignment submit, student join, test create |
| `23505` catch | Attendance scan/manual/start, join, tests, submissions, grade bootstrap |
| Rate limiting | Middleware + per-user (`RATE_LIMITING_SECURITY_REPORT.md`) |
| Payment claim RPC | Webhook + status poll (**new**) |
| Monime idempotency key | `checkout:{paymentId}`, `payment-code:{paymentId}` (**new**) |

### Client-side (existing — not modified)

| Pattern | Examples |
|---------|----------|
| `isSubmitting` / `disabled` | Auth forms, contact, create session |
| `saving` / `loading` | Grade clients, QR scanner, payment checkout |
| `useRef` guards | `processedRef` (QR), `registeredRef` (device), `refreshingRef` (attendance panel) |

### Gaps

- No server-side idempotency keys on grade saves
- Checkout creates **new** `payments` row per click (intentional — multiple attempts allowed)
- No debounce library (rely on disable flags)

---

## 6. Database Integrity Protection

### Key unique constraints (migrations)

| Table | Constraint | Purpose |
|-------|------------|---------|
| `attendance_records` | `(attendance_session_id, enrollment_id)` | One mark per student per session |
| `attendance_sessions` | **partial unique** `(class_session_id, lecturer_id) WHERE active` | One open session (**044**) |
| `enrollments` | `(class_session_id, student_id)` | One enrollment per student per class |
| `assignment_submissions` | `(assignment_id, enrollment_id)` | One submission per student per assignment |
| `assignment_grades` | `assignment_submission_id` | One grade per submission |
| `test_scores` | `(class_test_id, enrollment_id)` | One score per test per student |
| `class_tests` | `(class_session_id, semester, academic_year, test_number)` | Max two tests |
| `ca_configurations` | `(class_session_id, semester, academic_year)` | One CA config row |
| `device_registrations` | partial uniques on active authority device | Anti device sharing |
| `subscription_notifications` | `(lecturer_id, end_date, days_before)` | Deduped reminders |

### Transaction requirements

| Operation | Atomic? | Notes |
|-----------|---------|-------|
| Device transfer RPC | Yes | `SELECT … FOR UPDATE` in PL/pgSQL |
| Payment activation | **Partial → improved** | Claim RPC serializes; subscription+profile+payment still multi-step but single winner |
| Assignment upload | No | Storage upload then DB insert; `23505` cleans storage |
| Manual student add | Partial | Compensating delete on enroll failure |
| Grade batch save | No | Upsert/delete sequence; reordered for safety |

### New migration

**`044_concurrency_resilience.sql`** — apply in Supabase before production deploy:

```sql
-- Run in Supabase SQL Editor or via supabase db push
```

Contents:
1. Close duplicate active attendance sessions (one-time cleanup)
2. `idx_one_active_attendance_session_per_class` unique partial index
3. `payment_status` enum value `processing`
4. `claim_payment_for_activation(uuid)` — `FOR UPDATE` + status transition
5. `release_payment_activation_claim(uuid)` — rollback to `pending` on failure

---

## 7. Supabase Review

### Database interactions

- **Service role** used for lecturer/admin mutations bypassing RLS where required
- **User client** used for student attendance insert (RLS-enforced)
- **Upserts:** grades, scores, CA, profiles, site_settings — default overwrite on conflict

### Realtime subscriptions

| Consumer | Table | Event | Concurrency note |
|----------|-------|-------|------------------|
| `attendance-session-panel.tsx` | `attendance_records` | INSERT | Merges into present map; skips duplicates |
| `session-page-client.tsx` | `attendance_records` | * | Triggers debounced student-rows refresh |

Realtime does **not** write data — read-side sync only. No subscription-induced write races.

### Operations benefiting from locks / RPCs

| Operation | Solution |
|-----------|----------|
| Payment activation | **Implemented** — claim RPC |
| Device transfer | **Existing** — `FOR UPDATE` |
| Attendance session start | **Implemented** — unique index |
| Grade batch save | **Recommended future** — single RPC transaction |
| Admin subscription extend | **Recommended future** — `FOR UPDATE` on profile row |

---

## 8. High-Traffic Readiness

### Existing protections

- Edge middleware rate limits (IP-based on all `/api/*`)
- Per-user attendance scan limit
- Stateless API routes (horizontally scalable on Vercel)
- Partial indexes for hot queries (active sessions, attendance records)
- QR token rotation limits replay window (~20s)

### Bottlenecks under load

| Resource | Risk at scale | Mitigation today |
|----------|---------------|------------------|
| Attendance scan burst | DB write contention on `attendance_records` | Unique index + rate limits |
| Student-rows aggregation | Heavy read per lecturer session page | Rate limit 60/min; debounced client fetch |
| Export workbook | CPU/memory on serverless | 10/hour rate limit |
| Supabase connection pool | Many concurrent serverless invocations | Supabase pooler (deployment config) |
| Realtime fan-out | Many students × many sessions | Supabase plan limits |

### Graceful degradation

- Rate limit → 429 with generic message
- Duplicate attendance → 409 (not 500)
- Payment in progress → `processing` status (poll continues)
- Transient errors classified in `classify.ts`

---

## 9. Failure Recovery

### Partial update risks

| Flow | Failure mode | Recovery |
|------|--------------|----------|
| Payment activation | Subscription inserted, profile fails | Subscription row deleted (existing) |
| Payment activation | Claim held, activation throws | **Release claim → pending** (new) |
| Assignment upload | Storage OK, DB insert fails | Storage file deleted (existing) |
| Manual student | Enroll fails | Manual row deleted (existing) |
| Grade save | Upsert OK, delete fails | Partial clear — user can retry Save |

### Safe failure principle

Operations return explicit HTTP errors; sanitized messages prevent leaking internals. Attendance and enrollment duplicates return **409** with stable user-facing text.

---

## 10. Error and Conflict Handling

| Domain | Conflict detection | User feedback |
|--------|-------------------|---------------|
| Attendance duplicate | `23505` + pre-check | 409 — already recorded |
| Session already active | App check + `23505` | 409 — end session first |
| Student join duplicate | `23505` | 409 — already enrolled |
| Test limit | App check + `23505` | 409 — both tests exist |
| Assignment resubmit | Pre-check + `23505` | 403 — already submitted |
| Grades | None | Last write wins silently |
| Payment double activation | Claim RPC | Idempotent success or `processing` |

**No silent privilege escalation** from races — role immutability is DB-enforced.

---

## 11. Security Review (Concurrency Abuse)

| Attack | Prevented? |
|--------|------------|
| Double attendance via rapid scans | Yes — unique + rate limit |
| Mark attendance for another student | No — RLS + enrollment binding |
| Double enrollment | Yes — unique |
| Double premium from one payment | **Yes** — claim RPC (new) |
| Role escalation via race | Yes — triggers block metadata role |
| Grade manipulation via parallel requests | Authorization only — same lecturer can overwrite |
| Bypass subscription via concurrent checkout | Business rules + `hasActiveSubscriptionPeriod` check |

---

## 12. Production Readiness

### Concurrency protections implemented (this review)

| Change | File(s) |
|--------|---------|
| Active session unique index + cleanup | `supabase/migrations/044_concurrency_resilience.sql` |
| Payment claim / release RPCs | `044_concurrency_resilience.sql` |
| Payment activation serialization | `src/lib/concurrency/payment-activation.ts`, `src/lib/subscription/lifecycle.ts` |
| Webhook in-progress handling | `src/app/api/webhooks/monime/route.ts` |
| Status poll `processing` | `src/app/api/payments/[paymentId]/status/route.ts` |
| Monime stable idempotency keys | `src/lib/monime.ts` |
| Attendance start `23505` → 409 | `src/app/api/attendance/start/route.ts` |
| Submission insert `23505` | `src/lib/assignments/submissions.ts` |
| Grade bootstrap `23505` | `src/lib/lecturer/class-assignments.ts` |
| Test create `23505` → 409 | `src/app/api/lecturer/sessions/[id]/tests/route.ts` |
| Upsert-before-delete grades/scores | `grades/route.ts`, `scores/route.ts` |
| Postgres error helper | `src/lib/db/postgres-errors.ts` |
| `PaymentStatus` includes `processing` | `src/types/database.ts` |

### Files reviewed (complete list)

**API routes (59):** all under `src/app/api/` including attendance, lecturer, student, admin, payments, webhooks, auth, profile, contact, partnerships, cron.

**Libraries:** `src/lib/attendance/*`, `src/lib/assignments/*`, `src/lib/lecturer/*`, `src/lib/subscription/*`, `src/lib/monime.ts`, `src/lib/security/rate-limit-policies.ts`, `src/lib/security/api-abuse.ts`, `src/lib/db/postgres-errors.ts`, `src/lib/concurrency/payment-activation.ts`.

**Components (client guards):** `qr-scanner.tsx`, `attendance-session-panel.tsx`, `attendance-device-registrar.tsx`, `assignment-grades-client.tsx`, `test-grades-client.tsx`, `ca-structure-panel.tsx`, auth/contact forms.

**Migrations:** `001`, `005`, `016`, `018`, `026`, `027`, `031`, `042`, `043`, `044`.

### Remaining risks

1. **Multi-tab grade editing** — last-write-wins; recommend optional `graded_at` optimistic locking (server-only 409, client already refreshes after save).
2. **CA weight concurrent edits** — same as grades.
3. **Assignment upload** — storage committed before DB; orphan files possible if insert fails after storage success without cleanup path (rare; storage uses `upsert: false`).
4. **Payment activation** — multi-table writes not in one SQL transaction; claim prevents double completion but mid-flight crash could leave `processing` until manual fix or retry.
5. **Checkout duplicate pending payments** — user may have multiple pending rows; business-acceptable.
6. **No advisory locks** — except device transfer RPC.
7. **Session delete vs in-flight API** — cascade may cause transient errors.

### Production recommendations

1. **Apply migration `044_concurrency_resilience.sql`** in Supabase production immediately.
2. **Monitor** `duplicate_attendance_scan_attempt` audit events and 409 rates on attendance/start.
3. **Alert** on payments stuck in `processing` > 5 minutes.
4. **Supabase pooler** — use transaction mode for serverless if connection exhaustion appears.
5. **Future:** batch grade RPC in single transaction; `expectedGradedAt` conflict detection; stale `processing` payment sweeper cron.
6. **Load test** attendance scan at expected peak (e.g. 200 students × 1 scan within 60s per session) before large deployments.

---

## Deployment Checklist

- [ ] Run `044_concurrency_resilience.sql` on production Supabase
- [ ] Verify no duplicate active attendance sessions exist post-migration
- [ ] Deploy application code with this review’s changes
- [ ] Smoke-test: concurrent attendance start (second request → 409)
- [ ] Smoke-test: duplicate QR scan (409)
- [ ] Smoke-test: payment webhook + poll (single activation, `processing` during claim)
- [ ] Confirm Monime checkout retries use same idempotency key for same `paymentId`

---

*End of report.*
