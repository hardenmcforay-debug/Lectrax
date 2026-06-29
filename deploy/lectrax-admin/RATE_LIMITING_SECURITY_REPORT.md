# Rate Limiting Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase, Vercel)  
**Date:** June 19, 2026  
**Scope:** API rate limits, auth abuse, academic/admin operations, IP/user controls, monitoring, deployment  
**Constraint:** No UI/UX/business-logic changes except security hardening  
**Builds on:** `DDoS_SECURITY_REPORT.md` (initial middleware limits)

---

## Executive Summary

Lectrax previously had **no rate limiting**; the DDoS review added **middleware IP-based limits** on API routes. This review **audited all 47 API handlers**, auth flows, and resource-intensive operations, then **expanded** protection with:

1. **Centralized policy registry** — `rate-limit-policies.ts` (named limits for every sensitive class)
2. **Granular middleware rules** — grades, CA scores, student rows, notification polling, device registration, auth callback, branding uploads
3. **Per-user limit on attendance scan** — dual IP + userId throttle (25/min/user)
4. **Violation logging** — `console.warn` with scope + IP only (no credentials)
5. **Route-level helper** — `enforce-rate-limit.ts` for authenticated endpoints

Login, signup, and password reset remain on **Supabase Auth** (client → Supabase API). Configure rate limits in the Supabase Dashboard.

---

## Protected Endpoints

### Middleware — IP-based (all `/api/*` + `/auth/callback`)

| Policy | Endpoint(s) | Limit | Window |
|--------|-------------|-------|--------|
| `contactForm` | `POST /api/contact` | 5 | 15 min |
| `partnershipInquiry` | `POST /api/partnerships/inquiry` | 5 | 15 min |
| `authCallback` | `GET /auth/callback` | 20 | 15 min |
| `attendanceScan` | `POST /api/attendance/scan` | 40 | 1 min |
| `deviceRegister` | `POST /api/attendance/device/register`, `.../transfer` | 10 | 15 min |
| `attendanceMutation` | Other `POST/PUT/PATCH/DELETE /api/attendance/*` | 60 | 1 min |
| `studentJoin` | `POST /api/student/join` | 10 | 15 min |
| `gradeUpdate` | `PUT .../assignments/.../grades` | 30 | 1 min |
| `scoreUpdate` | `PUT .../tests/.../scores` | 30 | 1 min |
| `assignmentSubmit` | `POST .../assignments/.../submit` | 15 | 15 min |
| `studentRows` | `GET .../student-rows` | 60 | 1 min |
| `notificationPoll` | `GET /api/student/notifications/counts` | 120 | 1 min |
| `paymentCheckout` | `POST /api/payments/checkout` | 8 | 15 min |
| `paymentStatusPoll` | `GET /api/payments/[id]/status` | 60 | 1 min |
| `dataExport` | `POST .../export-student-performance` | 10 | 1 hour |
| `brandingUpload` | `POST /api/admin/site-logo`, `landing-hero` | 10 | 15 min |
| `adminMutation` | `POST/PUT/PATCH/DELETE /api/admin/*` | 40 | 1 min |
| `apiMutation` | All other mutating `/api/*` | 100 | 1 min |
| `apiRead` | All other `GET /api/*` | 200 | 1 min |

**Exempt:** `POST /api/webhooks/monime`, `POST /api/cron/subscription-lifecycle` (machine auth).

### Route handler — user-based (after authentication)

| Policy | Endpoint | Limit | Window |
|--------|----------|-------|--------|
| `attendanceScanPerUser` | `POST /api/attendance/scan` | 25 | 1 min |

Complements IP limit `attendanceScan` (40/min) — reduces NAT/shared-IP false positives.

### Supabase Auth (platform, not Lectrax middleware)

| Operation | Client path | Protection |
|-----------|-------------|------------|
| Login | `supabase.auth.signInWithPassword` | Supabase Auth rate limits |
| Signup | `supabase.auth.signUp` | Supabase Auth + migration `042` |
| Password reset email | `supabase.auth.resetPasswordForEmail` | Supabase Auth |
| Email verification | Supabase email flow | Supabase Auth |
| Password update | `supabase.auth.updateUser` | Authenticated session required |

### Not server-rate-limited (by design)

| Operation | Reason |
|-----------|--------|
| Admin table search | Client-side filter only — no search API |
| Page navigation | Static/SSR pages — CDN + Vercel edge absorb load |
| Supabase Realtime | Platform connection limits |

---

## Rate Limits Implemented — Architecture

```
Request
  → middleware: rejectIfAbusiveRequest()
       ├─ Content-Length body cap (413)
       └─ IP rate limit by policy (429 + Retry-After)
  → middleware: CSRF check
  → middleware: session refresh
  → API route: auth guards
  → API route: rejectIfUserRateLimited() [attendance scan only]
  → business logic
```

### Files

| File | Role |
|------|------|
| `src/lib/security/rate-limit-policies.ts` | Named limit definitions |
| `src/lib/security/rate-limit.ts` | Sliding-window store + violation log |
| `src/lib/security/api-abuse.ts` | Middleware IP limits + path resolution |
| `src/lib/security/enforce-rate-limit.ts` | Per-user/route helper |
| `src/lib/security/request-limits.ts` | Body size caps |
| `src/middleware.ts` | Wires abuse checks first |
| `src/app/api/attendance/scan/route.ts` | Per-user scan limit |

---

## Abuse Scenarios Prevented

| Scenario | Mitigation |
|----------|------------|
| Contact/partnership spam | 5/15min/IP |
| Session code brute force | 10 join attempts/15min/IP |
| Attendance scan automation | 40/min/IP + 25/min/user |
| QR device registration flood | 10/15min/IP |
| Grade/score bulk API abuse | 30/min/IP per route class |
| Excel export CPU exhaustion | 10/hour/IP |
| Payment checkout spam | 8/15min/IP |
| USSD polling amplification | 60/min/IP |
| Admin privilege abuse (stolen session) | 40 mutations/min/IP |
| General API flood | 100 mutations / 200 reads per min/IP |
| OAuth callback abuse | 20/15min/IP |
| Oversized body DoS | 413 at edge |

---

## Authentication Protection

| Threat | Status |
|--------|--------|
| Brute-force login | **Supabase Auth** — enable Dashboard rate limits + CAPTCHA |
| Credential stuffing | Same; no passwords stored in Lectrax |
| Mass signup | Supabase Auth; `platform_admin` blocked in DB (`042`) |
| Password reset flood | Supabase Auth email throttling |
| Account enumeration | Generic forgot-password messaging (prior fix) |
| OAuth code replay | `/auth/callback` rate limited |

**Recommendation:** Supabase Dashboard → Authentication → Rate Limits → enable for sign-in, sign-up, and password recovery.

---

## Database Protection

| Operation | Limits | Other guards |
|-----------|--------|--------------|
| Student rows load | 60 GET/min/IP | Lecturer session ownership |
| Notification counts | 120 GET/min/IP | Student role + `student_id` filter |
| Bulk grades/scores | 30 PUT/min/IP | Zod UUID + enrollment validation |
| Export workbook | 10 POST/hour/IP | Lecturer auth + session ownership |
| Admin list pages | SSR pagination | GET API fallback 200/min |
| Service role writes | Reduced by API throttles | API auth guards + RLS |

---

## Monitoring and Logging

| Event | Logged |
|-------|--------|
| Rate limit exceeded | `[rate-limit] scope=<policy> ip=<ip>` via `console.warn` |
| Duplicate attendance scan | `audit_logs` (`duplicate_attendance_scan_attempt`) |
| CSRF violation | 403 (no body leak) |

**Not logged:** passwords, tokens, email content, full request bodies.

**Recommended alerts:** spike in 429 rate; spike in `authCallback` blocks; Supabase Auth failed login metrics.

---

## Supabase and Deployment

| Layer | Rate limiting |
|-------|---------------|
| **Lectrax middleware** | IP (+ user for scan) — in-memory per isolate |
| **Vercel** | Platform DDoS absorption; add **Firewall** rules for `/api/*` |
| **Supabase Auth** | Built-in throttling (configure in dashboard) |
| **Supabase PostgREST** | RLS limits data scope; API throttles reduce call volume |
| **Upstash Redis** | Recommended for distributed limits across isolates |

`vercel.json` — crons only; no edge rate rules yet.

---

## Security Testing

| Test | Expected |
|------|----------|
| 6× `POST /api/contact` in 1 min | 429 on 6th |
| 41× attendance scan/min same IP | 429 on 41st (IP) |
| 26× scan/min same user | 429 on 26th (user) |
| Normal lecturer grading session | Well under 30/min |
| USSD poll every 2s | ~30/min — within 60/min |
| Legitimate student single scan | Pass |
| Webhook POST | No rate limit (HMAC required) |

**Verification:** `npm run typecheck` — pass

---

## Security Improvements Applied (This Review)

1. **`rate-limit-policies.ts`** — single source of truth for all limits  
2. **Expanded `api-abuse.ts`** — grades, scores, student-rows, notifications, device, auth callback, branding  
3. **`logRateLimitViolation()`** — security monitoring hook  
4. **`enforce-rate-limit.ts`** — reusable user/key limiter  
5. **Attendance scan** — per-user limit in addition to IP  

---

## Remaining Risks

| Severity | Risk | Mitigation |
|----------|------|------------|
| **High** | In-memory limits not global on serverless | Upstash Redis + Vercel Firewall |
| **Medium** | Login/signup not in Lectrax middleware | Supabase Auth rate limits + CAPTCHA |
| **Medium** | NAT/shared IP on academic endpoints | Expand per-user limits to grades/join |
| **Low** | No `report-uri` for limit analytics | Log drain + metrics |
| **Info** | Chunked uploads without Content-Length | Route-level file size validation exists |

---

## Production Scaling Recommendations

1. **Upstash Redis** — `@upstash/ratelimit` with same policy names  
2. **Vercel Firewall** — challenge mode + `/api/*` burst rules  
3. **Supabase** — Auth rate limits, log drain, connection pooling  
4. **Per-role limits** — stricter caps for `platform_admin` mutations  
5. **CAPTCHA** — Turnstile on public forms if spam persists  
6. **HSTS preload** — already in `headers.ts`  

---

## Related Reports

- `DDoS_SECURITY_REPORT.md`
- `API_ENDPOINT_SECURITY_REPORT.md`
- `HTTP_SECURITY_HEADERS_REPORT.md`
- `AUTHENTICATION_SECURITY_REPORT.md`
- `CSRF_SECURITY_REPORT.md`

---

*End of Rate Limiting Security Review*
