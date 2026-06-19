# Server-Side Validation Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase, Vercel)  
**Date:** June 19, 2026  
**Scope:** All data entry points — API routes, auth flows, file uploads, admin ops, Supabase RPC callers  
**Constraint:** No UI/UX/business-logic changes except security validation hardening  
**Builds on:** `API_ENDPOINT_SECURITY_REPORT.md`, `AUTHORIZATION_SECURITY_REPORT.md`, `FILE_UPLOAD_SECURITY_REPORT.md`, `AUTHENTICATION_SECURITY_REPORT.md`

---

## Executive Summary

Lectrax already used a **strong Zod validation baseline** (`src/lib/validations.ts` + `zod-helpers` with sanitization) across most JSON API routes. Mutations generally map `parsed.data` to explicit DB columns — **no mass-assignment vulnerabilities** were found.

This review audited **60 API route handlers**, auth flows, upload paths, and RPC callers. Gaps addressed in this review:

1. **Student performance export** — stopped trusting client-supplied row data; server re-queries via `getStudentTableRows`
2. **Attendance scan** — full-body Zod schema + `require_gps` enforcement + safe JSON parse
3. **Attendance start** — centralized schema with sanitized/bounded `title`
4. **Bulk grade saves** — max 500 entries per request
5. **Monime webhook** — Zod event schema + safe `JSON.parse`
6. **Site logo upload** — extension/MIME cross-check (aligned with hero route)
7. **Profile PATCH** — `college_id` writable only for students
8. **Route param UUID validation** — export, student-rows, assignment submit
9. **Student-rows CA preview** — Zod-validated query weight overrides
10. **Device register/transfer** — safe JSON body parsing

**No Next.js server actions** exist; all mutations are API route handlers.

---

## 1. Data Entry Points Reviewed

### API routes (60 handlers)

| Category | Routes | Validation pattern |
|----------|--------|-------------------|
| Auth | `forgot-password`, `role` | Zod + enumeration-safe BFF |
| Public | `contact`, `partnerships/inquiry` | Zod + sanitized strings |
| Profile | `profile` GET/PATCH | Zod; role-scoped fields |
| Student | `join`, `notifications/*`, `assignments/*` | Zod / file validation / UUID params |
| Attendance | `scan`, `start`, `end`, `refresh`, `manual`, `device/*` | Zod (expanded this review) |
| Lecturer | `sessions/*`, `assignments/*`, `tests/*`, `ca-config`, `export`, `student-rows` | Zod + ownership checks |
| Payments | `checkout`, `status`, `webhooks/monime` | Zod + signature (webhook hardened) |
| Admin | `subscriptions`, `toggle-lecturer`, `contact/*`, `partnerships/*`, branding | Zod / file validation |
| Cron | `subscription-lifecycle` | Bearer secret; no body |

### Authentication flows (client → Supabase / BFF)

| Flow | Server validation |
|------|-------------------|
| Login / signup | Client Zod + Supabase Auth; signup enumeration-resistant |
| Forgot password | **BFF** `forgotPasswordSchema` + server account lookup |
| Reset password | Client `passwordChangeSchema`; session from recovery callback |
| Auth callback | Code exchange server-side; role from DB not metadata |

### File uploads

| Path | Server validation |
|------|-------------------|
| Assignment submit | `validateSubmissionFile` + PDF scan + storage `upsert: false` |
| Site logo | `isAllowedBrandingImage` + **extension/MIME match** (new) |
| Landing hero | `isAllowedBrandingImage` + `brandingExtensionMatchesMime` |

### Supabase RPCs (called from app)

| RPC | Input validation |
|-----|------------------|
| `register_student_attendance_device` | Zod device identity schema |
| `transfer_student_attendance_device` | Zod device identity schema |
| `verify_student_attendance_device` | Zod + server session checks |
| `lock_expired_assignment_submissions` | UUID param or null |
| `claim_payment_for_activation` | UUID from payment row |
| `get_my_role` | No user input |

---

## 2. Validation Weaknesses Discovered

| ID | Weakness | Severity | Status |
|----|----------|----------|--------|
| V1 | Export trusted client `rows` (grades/CA tampering) | **High** | **Fixed** — server-side `getStudentTableRows` |
| V2 | Attendance scan partial validation; GPS not enforced | **High** | **Fixed** — `attendanceScanSchema` + `require_gps` |
| V3 | Webhook `JSON.parse` without schema | **Medium** | **Fixed** — `monimeWebhookEventSchema` |
| V4 | Bulk grade arrays unbounded (DoS) | **Medium** | **Fixed** — `BULK_GRADE_ENTRY_MAX = 500` |
| V5 | Site logo missing extension/MIME cross-check | **Medium** | **Fixed** |
| V6 | Lecturers could set `college_id` via profile PATCH | **Medium** | **Fixed** — students only |
| V7 | Route UUID params unvalidated | **Medium** | **Partially fixed** — critical routes; pattern in `parseRouteUuid` |
| V8 | Attendance start `title` unbounded/unsanitized | **Low** | **Fixed** — `attendanceStartSchema` |
| V9 | Student-rows weight overrides loose `Number()` | **Low** | **Fixed** — `studentRowsWeightQuerySchema` |
| V10 | Device routes missing JSON try/catch | **Low** | **Fixed** |
| V11 | CA weights need not sum to 100% | **Low** | **Documented** — matches current product behavior |
| V12 | Assignment deadline accepts any parseable date | **Low** | **Documented** |
| V13 | Login password min 6 vs signup min 8 | **Low** | **Documented** (legacy accounts) |
| V14 | Zod schemas not `.strict()` | **Low** | **Documented** — extra keys stripped safely |

---

## 3. Security Improvements Applied

### New shared utilities

| File | Purpose |
|------|---------|
| `src/lib/security/parse-request.ts` | `parseJsonBody()`, `parseRouteUuid()` |
| `src/lib/validations.ts` (expanded) | `attendanceScanSchema`, `attendanceStartSchema`, `exportStudentPerformanceSchema`, `monimeWebhookEventSchema`, `studentRowsWeightQuerySchema`, `BULK_GRADE_ENTRY_MAX` |

### Route / handler changes

| File | Change |
|------|--------|
| `src/app/api/lecturer/sessions/[id]/export-student-performance/route.ts` | Server fetch; optional validated CA weight overrides; UUID param |
| `src/app/api/attendance/scan/route.ts` | Full scan schema; GPS required when session `require_gps`; safe JSON |
| `src/app/api/attendance/start/route.ts` | `attendanceStartSchema`; sanitized title |
| `src/app/api/webhooks/monime/route.ts` | Webhook Zod + safe parse |
| `src/app/api/admin/site-logo/route.ts` | `brandingExtensionMatchesMime` |
| `src/app/api/profile/route.ts` | `college_id` only for students |
| `src/app/api/lecturer/sessions/[id]/student-rows/route.ts` | Zod weight query schema; UUID param |
| `src/app/api/student/assignments/[assignmentId]/submit/route.ts` | UUID param validation |
| `src/app/api/attendance/device/register/route.ts` | Safe JSON parse |
| `src/app/api/attendance/device/transfer/route.ts` | Safe JSON parse |
| `src/components/lecturer/student-performance-export-button.tsx` | POST empty body (server authoritative; no UI change) |

### Existing protections (verified, not changed)

- **Sanitization:** `sanitizeTextInput`, `sanitizeSessionCode`, `sanitizePhoneInput` on text fields
- **Field limits:** `FIELD_LIMITS` on names, emails, messages, titles, etc.
- **Mass assignment:** Routes use explicit field mapping, not `...body` into DB
- **Authorization:** `requireStudentRole`, `requireLecturerRole`, `requirePlatformAdmin`, subscription guards, enrollment ownership checks
- **File uploads:** Assignment PDF validation, size/MIME checks, optional VirusTotal (prior review)
- **Rate limiting:** Middleware IP limits on mutations (prior reviews)
- **Error sanitization:** `sanitizeErrorMessage` on DB failures (prior review)

---

## 4. Authorization Validation Findings

| Area | Enforcement |
|------|-------------|
| Role escalation | DB triggers block self-role change; signup blocks `platform_admin` |
| Lecturer scope | `getClassSessionForLecturer`, `getClassAssignmentForLecturer`, enrollment ∈ class checks |
| Student scope | Enrollment + `student_id` match on submissions/attendance |
| Admin | `requirePlatformAdmin` with service-backed role verification |
| Subscription writes | `requireWritableSubscription` on academic mutations |
| Payment activation | Claim RPC + lecturer ownership on status poll |
| Manual attendance DELETE | Blocks QR-locked `mark_method` rows |

**No authorization bypass** via validation gaps was identified after fixes.

---

## 5. Never Trust Client Data — Patterns

| Anti-pattern | Lectrax approach |
|--------------|------------------|
| Client-only validation | Duplicated with Zod on server for all JSON mutations |
| Trusting export/report data | **Fixed** — export re-queries DB |
| Trusting route params | UUID validation helper on critical paths |
| Trusting webhook JSON | Signature + Zod schema |
| Trusting FormData fields | File type/size/MIME checks; ignore extra fields |
| Trusting metadata for role | Role from `profiles` / RPC only |

---

## 6. Error Handling

| Response type | Behavior |
|---------------|----------|
| Validation (400) | Zod first error message or generic "Invalid …" |
| Auth (401/403) | Static role/resource messages |
| DB errors | `sanitizeErrorMessage` — no schema/SQL leakage |
| Webhook malformed | `received: true` after signature OK (avoid provider retry storms) |

---

## 7. Remaining Risks

| Risk | Severity | Recommendation |
|------|----------|----------------|
| UUID params on all 40+ dynamic routes | Low | Apply `parseRouteUuid` incrementally or middleware |
| Unsaved CA preview not in export | Low | Optional: pass validated weight overrides from client (API already supports) |
| CA weights sum ≠ 100% | Low | Product decision; add `.refine()` if business requires |
| Past assignment deadlines | Low | Add server refine if business requires future-only deadlines |
| Supabase Auth client flows (login/signup) | Low | Configure Supabase Dashboard rate limits |
| `.strict()` on Zod schemas | Low | Optional — reject unknown keys with 400 |
| `admin/grant-free` `days` vs billing plan duration | Low | Align API behavior with parameter semantics |

---

## 8. Production Recommendations

1. **Apply** migration `044_concurrency_resilience.sql` if not already applied (payment claims unrelated but production-critical).
2. **Extend** `parseRouteUuid` to remaining `[id]` routes during routine maintenance.
3. **Load-test** bulk grade endpoint with 500-entry payloads.
4. **Monitor** 400/413/429 rates on attendance scan and export endpoints.
5. **Consider** centralized `validateApiRequest(schema, request)` helper to reduce per-route boilerplate.

---

## 9. Security Testing Performed

| Test | Result |
|------|--------|
| Malformed JSON on attendance/device routes | 400 Invalid request body |
| Invalid UUID route params | 400 Invalid … ID |
| Oversized bulk grade array (>500) | 400 Zod max error |
| Export with tampered client rows | Ignored — server data used |
| Scan without GPS when `require_gps` | 400 Location required |
| Webhook invalid JSON after valid signature | 400 or graceful `received: true` |
| Lecturer PATCH with `collegeId` | `college_id` not updated |
| Typecheck (`npm run typecheck`) | Pass |

---

## Files Modified (This Review)

- `src/lib/security/parse-request.ts` (new)
- `src/lib/validations.ts`
- `src/app/api/lecturer/sessions/[id]/export-student-performance/route.ts`
- `src/app/api/lecturer/sessions/[id]/student-rows/route.ts`
- `src/app/api/attendance/scan/route.ts`
- `src/app/api/attendance/start/route.ts`
- `src/app/api/attendance/device/register/route.ts`
- `src/app/api/attendance/device/transfer/route.ts`
- `src/app/api/webhooks/monime/route.ts`
- `src/app/api/admin/site-logo/route.ts`
- `src/app/api/profile/route.ts`
- `src/app/api/student/assignments/[assignmentId]/submit/route.ts`
- `src/components/lecturer/student-performance-export-button.tsx`

---

*End of report.*
