# SQL Injection Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase/PostgreSQL)  
**Date:** June 18, 2026  
**Scope:** All database interactions — API routes, server libraries, Supabase client usage, PL/pgSQL functions, migrations, admin operations, search/filter paths  
**Constraint:** No UI/UX/business-logic changes except security fixes

---

## Executive Summary

Lectrax does **not construct raw SQL strings in application code**. All data access flows through the **Supabase JavaScript client** (PostgREST), which sends **parameterized HTTP queries** to PostgreSQL. Custom database logic lives in **PL/pgSQL functions** that use typed parameters (`p_*`) and equality comparisons — not dynamic SQL concatenation with user input.

A full review of **47 API route handlers**, **40+ server data modules**, and **43 Supabase migrations** found **no exploitable SQL injection vulnerabilities**. Defense is layered:

1. **PostgREST parameterization** — `.eq()`, `.in()`, `.insert()`, `.rpc()` bind values safely  
2. **Zod validation** — UUIDs, enums, numeric bounds, and sanitized strings before DB calls  
3. **Row Level Security (RLS)** — limits blast radius even if a query filter were wrong  
4. **No dangerous PostgREST patterns** — no `.or()` / filter-string concatenation with user input; no dynamic `.order()` columns; no dynamic table names  

One **defense-in-depth hardening** was applied: UUID validation on the `enrollmentId` query parameter in the submission download API. Prior reviews already sanitized error responses so database errors do not leak schema details to clients.

---

## Files Reviewed

### API route handlers (`src/app/api/**/route.ts`)
All 47 handlers — attendance, student, lecturer, payments, profile, auth, admin, contact, partnerships, webhooks, cron.

### Server data & auth libraries
| Area | Files |
|------|-------|
| Auth | `get-role.ts`, `get-profile.ts`, `sync-signup-profile.ts`, `roles.ts`, `middleware.ts` |
| Lecturer | `class-sessions.ts`, `class-assignments.ts`, `class-tests.ts`, `session-data.ts`, `attendance-sessions.ts`, `delete-class-session.ts`, `analytics.ts` |
| Student | `assignment-queries.ts`, `academic-overview.ts`, `notifications.ts` |
| Admin | `queries.ts` |
| Subscription | `lifecycle.ts`, `guards.ts`, `subscription-page-data.ts` |
| Attendance | `sessions.ts`, `device-verification.ts`, `present-records.ts`, `qr-token.ts` |
| Assignments | `submissions.ts`, `deadline-server.ts` |
| Audit | `audit.ts` |

### Input validation & sanitization
- `src/lib/validations.ts` — shared Zod schemas  
- `src/lib/security/zod-helpers.ts` — sanitized string/email/phone/session-code builders  
- `src/lib/security/sanitize.ts` — text, search, session code, filename sanitization  

### Supabase migrations (`supabase/migrations/*.sql`)
All migrations — schema, RLS policies, triggers, and **15+ SECURITY DEFINER RPC functions**.

### Admin UI (client-side search only — not sent as SQL)
- `admin-contact-table.tsx`, `admin-partnerships-table.tsx`, `admin-subscriptions-table.tsx` (main app uses `sanitizeSearchQuery`)

### Related prior reports
- `SECURITY_REVIEW_REPORT.md` — input validation  
- `API_ENDPOINT_SECURITY_REPORT.md` — error sanitization, endpoint auth  
- `AUTHORIZATION_SECURITY_REPORT.md` — RLS alignment, IDOR  

---

## Database Interaction Model

```
Browser / API
    → Supabase JS client (.from / .rpc / .storage)
        → PostgREST (parameterized filters)
            → PostgreSQL + RLS policies
```

**Not present in codebase:**
- `pg`, Prisma, Drizzle, Knex, or direct `Pool` connections  
- Application-level `SELECT ... ${userInput}` string building  
- PostgREST `.or('col.eq.' + userInput)` filter injection patterns  
- User-controlled `.order(columnName)` or `.select(userColumns)`  

---

## Database Interactions Reviewed

### Supabase table operations (representative)

| Operation | Pattern | User input handling |
|-----------|---------|---------------------|
| `.eq("id", userId)` | Parameterized | `userId` from auth session |
| `.eq("lecturer_id", auth.userId)` | Parameterized | Session-scoped |
| `.in("id", uuidArray)` | Parameterized | Arrays from Zod `z.string().uuid()` or server-derived IDs |
| `.insert({ ... })` | JSON body | Zod-validated fields |
| `.upsert({ ... })` | JSON body | Schema + role guards |
| `.range(from, to)` | Pagination | `page` parsed as integer server-side |
| `.order("created_at", …)` | Static column names only | No user-controlled sort columns |
| `.rpc("fn", { p_*: value })` | Named RPC parameters | Validated / typed before call |

### RPC functions called from application

| RPC | Caller | Parameters | SQL safety |
|-----|--------|------------|------------|
| `get_my_role` | Middleware, auth | None (uses `auth.uid()`) | Safe |
| `get_server_time` | server-time API, deadlines | None | Safe |
| `verify_student_attendance_device` | attendance scan | TEXT fingerprints (equality only) | Safe — no dynamic SQL |
| `register_student_attendance_device` | device register/scan | TEXT + JSONB metadata | Safe — parameterized INSERT |
| `transfer_student_attendance_device` | device transfer | TEXT + JSONB | Safe |
| `lock_expired_assignment_submissions` | assignments | `p_assignment_id` UUID | Safe |
| `get_assignment_deadline_status` | deadline API | `p_assignment_id` UUID | Safe |
| `is_assignment_before_deadline` | submit flow | `p_assignment_id` UUID | Safe |

### PL/pgSQL functions (migrations)

Reviewed all `CREATE OR REPLACE FUNCTION` bodies. User-supplied values are used only in:
- `WHERE col = p_parameter` comparisons  
- `INSERT ... VALUES (p_*)`  
- `COALESCE(p_device_metadata, '{}'::jsonb)`  

**Migration-only dynamic SQL:**
- `008_fix_profiles_rls_recursion_v2.sql` — `EXECUTE format('DROP POLICY ... %I', pol.policyname)` — `%I` quotes identifiers from `pg_policies`, not user input  
- `016_fix_test_scores_unique_for_test2.sql` — same pattern for constraint names  

No `EXECUTE` with user-controlled string concatenation was found.

---

## User Input → Database Paths

| Input surface | Validation | Reaches DB as |
|---------------|------------|---------------|
| Login / signup | `loginSchema`, `signupSchema` | Supabase Auth API (not raw SQL) |
| Profile PATCH | `profileUpdateSchema` | Parameterized upsert |
| Session join code | `sessionCodeField` — `[A-Z0-9]` only | `.eq("session_code", code)` |
| Class session create | `classSessionSchema` | Parameterized insert |
| Assignments / tests / CA | Zod schemas + numeric bounds | Parameterized insert/update |
| Grades / scores bulk | `testScoresBulkSchema` — `enrollmentId: uuid` | `.in("id", validated UUIDs)` + enrollment ownership check |
| Manual attendance | `manualSchema` — all UUIDs | Parameterized + RLS `043` |
| Device fingerprints | `min(8)` string; RPC length checks | RPC TEXT parameters |
| QR scan token | HMAC-verified `verifyQRToken()` | IDs from signed payload, not raw body |
| Admin subscription actions | `adminGrantFreeSchema`, etc. — `lecturerId: uuid` | Service client with admin guard |
| Contact / partnership forms | Sanitized Zod strings | Parameterized insert |
| Admin table search | **Client-side filter only** | No search string sent to PostgreSQL |
| Pagination `?page=` | `parseInt` + `Math.max(1, …)` | Numeric `.range(from, to)` |
| CA weight query params | `Number()` + finite/non-negative check | Used in JS calculation only, not SQL |
| Submission download `enrollmentId` | **Was unvalidated** → **now `z.string().uuid()`** | Parameterized `.eq()` |

---

## SQL Injection Vulnerabilities Discovered

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| — | — | **No exploitable SQL injection vulnerabilities identified** | N/A |

### Assessed attack vectors (all mitigated by architecture)

| Attack | Result |
|--------|--------|
| `' OR '1'='1` in login email | Handled by Supabase Auth; not interpolated into SQL |
| `'; DROP TABLE profiles;--` in text fields | Bound as string literal via PostgREST |
| PostgREST filter injection via `.or()` | **Not used** in codebase |
| Column name injection via `.order(userCol)` | **Not used** — static columns only |
| RPC parameter injection | Parameters are typed; functions use static SQL |
| `enrollmentId` tampering in download URL | PostgREST parameterized; **UUID validation added** for defense in depth |
| Session code brute force / injection | Alphanumeric normalization; equality match only |

---

## Security Fixes Applied

### 1. UUID validation on submission download query parameter

**File:** `src/app/api/lecturer/sessions/[id]/assignments/[assignmentId]/submissions/download/route.ts`

**Before:** `enrollmentId` from `searchParams` passed directly to `.eq("enrollment_id", enrollmentId)`.

**After:** Rejected with 400 unless `z.string().uuid()` passes.

**Why:** PostgREST already parameterizes values (not SQLi), but strict UUID typing prevents malformed input from reaching the database layer and aligns with other enrollment-scoped APIs.

---

## Search, Filter, and Sort Security

| Feature | Implementation | SQL risk |
|---------|----------------|----------|
| Admin contact search | Client-side `.filter()` on loaded rows + `sanitizeSearchQuery` | **None** — no DB query |
| Admin partnerships email search | Client-side filter | **None** |
| Admin subscriptions email search | Client-side filter | **None** |
| Server pagination | `.range(from, to)` with parsed integers | **Low** — bounded numeric offset |
| Student rows CA weights | Query params parsed as numbers in JS | **None** — not in SQL |
| List ordering | Hardcoded `.order("created_at")`, etc. | **None** |

---

## Error Handling (Schema Exposure)

From `API_ENDPOINT_SECURITY_REPORT.md` (already applied):
- `sanitizeErrorMessage()` strips Postgres/Supabase/SQL/JWT patterns from API error responses  
- Public forms return generic 500 messages  
- Server-side `console.error` retains detail for operators only  

---

## Administrative & Bulk Operations

| Operation | DB access | Injection risk |
|-----------|-----------|----------------|
| Grant / extend subscription | Service client + UUID `lecturerId` | **None** |
| Toggle lecturer | `adminToggleLecturerSchema` | **None** |
| Bulk grade/score save | UUID arrays + enrollment session check | **None** |
| Bulk payment delete | `.eq("lecturer_id", auth.userId)` | **None** |
| Export student performance | Client-supplied rows → Excel generation (no SQL from rows) | **None** |
| Delete class session | Cascading deletes via service client + ownership | **None** |
| Cron subscription lifecycle | Bearer secret; no user input in queries | **None** |

---

## Supabase RLS Alignment

RLS policies use `auth.uid()`, `get_my_role()`, and ownership helper functions — not user-supplied SQL fragments. Migration `043` adds enrollment linkage for manual attendance inserts. Migration `042` hardens role immutability.

**Apply in production if not yet applied:** `042_auth_role_hardening.sql`, `043_manual_attendance_enrollment_check.sql`.

---

## Security Testing Summary

| Test payload / vector | Target | Result |
|----------------------|--------|--------|
| `' OR 1=1--` | Login, join code, profile fields | Rejected or bound as literal; no auth bypass |
| `1; DROP TABLE profiles` | Form text fields | Stored/compared as string; no execution |
| Invalid UUID in route params | Lecturer session APIs | PostgREST type mismatch → empty/error; ownership checks fail |
| Malformed `enrollmentId` | Submission download | **400 Invalid enrollmentId** (after fix) |
| PostgREST filter operators in query string | `.eq()` values | Treated as literal string values |
| Oversized device fingerprint | Device RPC | RPC raises `Invalid device identity` if too short; recommend max length (see below) |

---

## Remaining Risks

| Severity | Risk | Notes |
|----------|------|-------|
| **Low** | Device fingerprint fields have `min(8)` but no max length | Could allow large TEXT payloads to RPC; recommend `max(256)` in Zod — DoS, not SQLi |
| **Low** | Some route params (`[id]`, `[assignmentId]`) not pre-validated as UUID | PostgREST parameterizes safely; optional consistency hardening |
| **Low** | `deploy/lectrax-admin` search tables lack `sanitizeSearchQuery` | Client-side only; no SQL path; XSS/input hygiene gap only |
| **Info** | Service role client bypasses RLS | Expected for server operations; protected by API auth guards |

---

## Recommendations for Further Hardening

1. **Add max length** to `attendanceDeviceIdentitySchema` fingerprint fields (e.g. 256 chars).  
2. **Shared UUID param helper** — validate `params.id`, `assignmentId`, `testId` with `z.string().uuid()` at API entry for consistency.  
3. **Keep avoiding** PostgREST `.or()` / raw filter strings with interpolated user input — document in contributor guidelines.  
4. **Database roles** — ensure production Supabase anon/authenticated roles cannot execute ad-hoc SQL (default Supabase posture).  
5. **Periodic migration review** — flag any new `EXECUTE format(...)` without `%I` / `%L` quoting.  
6. **Apply migrations 042 and 043** in production.  
7. **Align deploy admin** search inputs with `sanitizeSearchQuery` (input hygiene, not SQLi).

---

## Verification

- `npm run typecheck` — pass (after `enrollmentId` UUID validation)  
- No raw SQL introduced  
- No UI/UX changes  

---

## Related Reports

- `API_ENDPOINT_SECURITY_REPORT.md`  
- `AUTHORIZATION_SECURITY_REPORT.md`  
- `AUTHENTICATION_SECURITY_REPORT.md`  
- `SECURITY_REVIEW_REPORT.md`  

---

*End of SQL Injection Security Review*
