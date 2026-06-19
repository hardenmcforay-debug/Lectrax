# DDoS Protection Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase, Vercel)  
**Date:** June 18, 2026  
**Scope:** Traffic abuse, API rate limiting, auth abuse, resource exhaustion, bot protection, deployment hardening, Supabase exposure, monitoring  
**Constraint:** No UI/UX/business-logic changes except security hardening

---

## Executive Summary

Before this review, Lectrax had **no application-level rate limiting**, **no request body size guards at the edge**, and relied on Supabase Auth, CSRF middleware, Zod validation, and Vercel's platform defaults for abuse resistance.

A full audit of **47 API routes**, authentication flows, expensive operations, and deployment configuration identified **high abuse potential** on public forms, attendance scanning, session join, payment checkout, and export endpoints.

**Security improvements applied:**
1. **Middleware rate limiting** — per-IP sliding-window limits on API routes (`429` + `Retry-After`)
2. **Request body size rejection** — early `413` when `Content-Length` exceeds configured caps
3. **Centralized abuse module** — `src/lib/security/api-abuse.ts`, `rate-limit.ts`, `request-limits.ts`

**Remaining risks** are primarily **infrastructure-level**: volumetric DDoS, distributed botnets, and serverless per-instance rate limit stores. Recommend Vercel Firewall, WAF, and Upstash Redis for production-scale protection.

---

## DDoS Risks Identified (Before)

| Risk | Severity | Description |
|------|----------|-------------|
| No API rate limiting | **High** | Any endpoint could be flooded; DB/service role load unbounded |
| Public form spam | **High** | `/api/contact`, `/api/partnerships/inquiry` — unauthenticated inserts |
| Attendance scan abuse | **High** | `/api/attendance/scan` — auth required but repeatable per student session |
| Session code brute force | **Medium** | `/api/student/join` — guess session codes at scale |
| Payment checkout spam | **Medium** | `/api/payments/checkout` — creates payment rows + Monime API calls |
| USSD status polling | **Medium** | `/api/payments/[id]/status` — interval polling amplifiable |
| Export CPU abuse | **Medium** | Excel workbook generation in `/api/lecturer/sessions/[id]/export-student-performance` |
| Large body DoS | **Medium** | No edge rejection of oversized JSON/multipart before parsing |
| Login brute force | **Low–Med** | Handled by **Supabase Auth** (not Lectrax API) — platform limits apply |
| Admin bulk actions | **Medium** | Subscription grant/revoke, branding uploads without throttle |
| No WAF / edge rules | **High** | `vercel.json` has crons only — no firewall configuration |
| Serverless cold abuse | **Info** | Many concurrent isolates can each accept traffic |

---

## Vulnerable Endpoints (Prioritized)

### Critical abuse targets (now rate limited)

| Endpoint | Abuse vector | Limit applied |
|----------|--------------|---------------|
| `POST /api/contact` | DB fill, notification spam | 5 / 15 min / IP |
| `POST /api/partnerships/inquiry` | DB fill | 5 / 15 min / IP |
| `POST /api/attendance/scan` | Attendance fraud, RPC load | 40 / min / IP |
| `POST /api/student/join` | Session code guessing | 10 / 15 min / IP |
| `POST /api/payments/checkout` | Payment/Monime abuse | 8 / 15 min / IP |
| `GET /api/payments/[id]/status` | Polling amplification | 60 / min / IP |
| `POST .../export-student-performance` | CPU/memory (ExcelJS) | 10 / hour / IP |
| `POST /api/admin/*` | Privileged mutations | 40 / min / IP |
| `POST /api/attendance/*` | Start/end/refresh/manual flood | 60 / min / IP |
| `POST /api/student/assignments/*/submit` | Upload + storage abuse | 15 / 15 min / IP |
| All other `POST/PUT/PATCH/DELETE /api/*` | General API flood | 100 / min / IP |
| All `GET /api/*` | Read amplification | 200 / min / IP |

### Exempt (by design)

| Endpoint | Reason |
|----------|--------|
| `POST /api/webhooks/monime` | HMAC-verified provider callbacks |
| `POST /api/cron/subscription-lifecycle` | Bearer `CRON_SECRET` |

### Auth flows (Supabase, not Lectrax API)

| Flow | Protection |
|------|------------|
| Login | Supabase Auth rate limits + email confirmation policies |
| Signup | Supabase Auth; migration `042` blocks self-service `platform_admin` |
| Password reset | Supabase Auth `resetPasswordForEmail` |
| OAuth callback | `/auth/callback` — session exchange only |

---

## Security Improvements Applied

### 1. Rate limiting (`src/lib/security/rate-limit.ts`)

- In-memory **sliding-window** counter keyed by `scope:ip`
- Returns `429 Too Many Requests` with `Retry-After` header
- Invoked from middleware **before** CSRF checks and route handlers (fast reject)

**Serverless note:** Each Vercel isolate maintains its own bucket store. This **slows abuse** and protects single-instance bursts but is **not a global distributed limit**. Pair with Vercel Firewall or Upstash for full coverage.

### 2. Request body limits (`src/lib/security/request-limits.ts`)

| Path type | Max `Content-Length` |
|-----------|---------------------|
| Default JSON APIs | 512 KB |
| Assignment submit (multipart) | 12 MB |
| Admin branding upload | 6 MB |

Rejects with `413` when `Content-Length` header exceeds cap (no body read).

### 3. Middleware integration (`src/middleware.ts`)

```
Request → rejectIfAbusiveRequest() → rejectIfCsrfViolation() → updateSession()
```

Admin deploy (`deploy/lectrax-admin/src/middleware.ts`) also applies abuse checks after HTTPS redirect.

### Files added/modified

| File | Change |
|------|--------|
| `src/lib/security/rate-limit.ts` | **New** — sliding-window limiter |
| `src/lib/security/request-limits.ts` | **New** — body size caps |
| `src/lib/security/api-abuse.ts` | **New** — IP extraction, route rules, 429/413 responses |
| `src/middleware.ts` | Wire abuse checks |
| `deploy/lectrax-admin/src/middleware.ts` | Wire abuse checks |
| `deploy/lectrax-admin/src/lib/security/*` | Copied abuse modules + `csrf.ts` |

---

## Rate Limiting Recommendations (Further Hardening)

| Layer | Recommendation |
|-------|----------------|
| **Vercel Firewall** | Enable attack challenge mode; rate limit `/api/*` at edge |
| **Upstash Redis** | Replace in-memory store with `@upstash/ratelimit` for distributed limits |
| **Supabase Dashboard** | Review Auth rate limits; enable CAPTCHA on signup if abuse observed |
| **Per-user limits** | After auth, key limits by `userId` for attendance scan (reduces NAT false positives) |
| **Monime** | Confirm provider-side webhook/checkout rate limits |
| **Bot management** | Cloudflare Turnstile or hCaptcha on public contact/partnership forms |

### Suggested production limits (if moving to Redis)

| Scope | Limit | Window |
|-------|-------|--------|
| Public forms | 3 | 1 hour / IP |
| Attendance scan | 20 | 1 min / user |
| Login (via Supabase) | Platform default | — |

---

## Infrastructure Recommendations

| Area | Current state | Recommendation |
|------|---------------|----------------|
| **Vercel** | Next.js hosting, cron only in `vercel.json` | Add Firewall rules; enable DDoS mitigation tier |
| **CDN / Edge** | Vercel Edge for middleware | Use edge rate limits for static asset protection |
| **HTTPS** | HSTS in production (`headers.ts`) | Already enforced |
| **Cron** | Bearer secret on lifecycle route | Keep secret rotated; monitor failed auth |
| **Webhooks** | HMAC on Monime | No rate limit (correct); monitor signature failures |
| **Logging** | `console.error` on failures | Ship to Datadog/Logtail; alert on 429 spikes |

---

## Resource Protection Review

| Operation | Risk | Existing mitigation | Added |
|-----------|------|----------------------|-------|
| Excel export | CPU/memory | Lecturer auth + session ownership | 10/hour/IP rate limit |
| Assignment PDF upload | Storage bandwidth | 10 MB validation in route | 12 MB body cap + submit rate limit |
| Branding image upload | Storage | 5 MB validation | 6 MB body cap + admin rate limit |
| Bulk grades/scores | DB writes | Zod UUID validation, enrollment checks | General mutation limit |
| Admin list pages | Large reads | Pagination `.range()` | GET API limit 200/min |
| Realtime subscriptions | Connection count | Supabase platform limits | — |
| Service role client | Bypasses RLS | API auth guards only | Rate limits reduce call volume |

---

## Supabase Protection Review

| Area | Status |
|------|--------|
| Anon key exposure | Expected client-side; RLS enforces row access |
| Service role | Server-only; never in browser |
| RLS | Prevents unauthorized bulk extraction per user |
| PostgREST | Parameterized queries; no raw SQL from client |
| Auth API | Separate rate limits from Supabase |
| Realtime | WSS connections limited by Supabase plan |
| Abuse via repeated API | **Mitigated** by new middleware rate limits reducing DB round-trips |

**Recommendation:** Enable Supabase log drain; alert on unusual `auth.users` insert rate or failed login spikes.

---

## Authentication Abuse Protection

| Attack | Protection |
|--------|------------|
| Brute-force login | Supabase Auth (lockout/rate limits per Supabase config) |
| Credential stuffing | Same; no custom password storage in Lectrax |
| Mass signup | Supabase Auth; profile trigger assigns role |
| Password reset flood | Supabase Auth email rate limits |
| Account enumeration | Prior fix: generic forgot-password messaging |

Lectrax does **not** proxy login through `/api/*` — limits must be configured in **Supabase Dashboard → Auth → Rate Limits**.

---

## Request Validation (Fast Reject)

| Check | Where | Effect |
|-------|-------|--------|
| `Content-Length` cap | Middleware | 413 before body parse |
| CSRF | Middleware | 403 on forged mutations |
| Zod schemas | API routes | 400 on malformed input |
| UUID validation | Sensitive routes | 400 before DB |
| Role guards | API routes | 401/403 before work |

Invalid requests are rejected at middleware or validation layer without expensive business logic.

---

## Monitoring and Alerts (Recommended)

| Signal | Action |
|--------|--------|
| Spike in `429` responses | Investigate IP; tighten Firewall |
| Spike in `403` CSRF failures | Possible attack or client misconfiguration |
| Spike in `413` | Body-size attack or client bug |
| Failed Monime webhook signatures | Log and alert |
| Cron unauthorized `401` | Possible secret leak attempt |
| Supabase Auth failed logins | Dashboard metrics |
| Audit log: `duplicate_attendance_scan_attempt` | Review for automation |

---

## Security Testing Summary

| Test | Expected result |
|------|-----------------|
| 10 rapid `POST /api/contact` from same IP | 429 after 5th request (15 min window) |
| Oversized JSON `Content-Length: 999999` | 413 before handler |
| Normal lecturer dashboard usage | Below 100 mutations/min — unaffected |
| USSD payment polling (2s interval) | ~30/min — within 60/min limit |
| Webhook without rate limit | Still accepted (HMAC required) |
| Cron without Bearer | 401 (unchanged) |

**Verification:** `npm run typecheck` — pass

---

## Remaining Risks

| Severity | Risk | Mitigation path |
|----------|------|-----------------|
| **High** | Volumetric L3/L4 DDoS | Vercel/CDN provider absorption; not app-code solvable |
| **Medium** | Per-instance rate limit bypass (many IPs / isolates) | Upstash Redis + Vercel Firewall |
| **Medium** | NAT/shared IP false positives | Per-user limits after authentication |
| **Low** | Missing `Content-Length` on chunked uploads | Route-level size checks already on file uploads |
| **Low** | Login abuse (Supabase direct) | Configure Supabase Auth rate limits + CAPTCHA |
| **Info** | Search is client-side only | No server search endpoint to flood |

---

## Compatibility

| Feature | Impact |
|---------|--------|
| Normal student attendance scan | 40/min/IP — far above human scan rate |
| Lecturer attendance session control | 60/min/IP — sufficient for start/refresh/end |
| Payment USSD polling | 60/min — supports ~1/sec polling |
| Contact form | 5/15min — legitimate users unaffected |
| Supabase Auth / Realtime | Unchanged |
| UI/UX | No visual or workflow changes |

---

## Related Reports

- `HTTP_SECURITY_HEADERS_REPORT.md`
- `API_ENDPOINT_SECURITY_REPORT.md`
- `CSRF_SECURITY_REPORT.md`
- `AUTHENTICATION_SECURITY_REPORT.md`

---

*End of DDoS Protection Security Review*
