# Lectrax Frontend Security Review — Input Validation & Sanitization

**Date:** June 18, 2026  
**Scope:** Full Lectrax application (`src/`) — forms, client inputs, API validation alignment, secure rendering review  
**Constraint:** No functional, UI, or business-logic changes beyond validation/sanitization hardening.

---

## 1. Files Reviewed

### New security utilities
| File | Purpose |
|------|---------|
| `src/lib/security/sanitize.ts` | Text, search, session code, phone, filename, and query-param sanitization |
| `src/lib/security/zod-helpers.ts` | Reusable Zod field builders with sanitization + length limits |
| `src/lib/security/transport.ts` | HTTPS enforcement helpers (restored — was referenced but missing) |
| `src/lib/security/cookies.ts` | Secure cookie defaults in production (restored — was referenced but missing) |

### Central validation schemas
| File | Purpose |
|------|---------|
| `src/lib/validations.ts` | All shared Zod schemas — enhanced with sanitization, max lengths, phone/email rules |

### Auth & account
| File | Inputs reviewed |
|------|-----------------|
| `src/components/auth/auth-form.tsx` | Login email/password, signup fields, URL query params |
| `src/app/(auth)/forgot-password/page.tsx` | Email |
| `src/components/settings/profile-settings.tsx` | Full name, phone, college ID, password change |

### Public forms
| File | Inputs reviewed |
|------|-----------------|
| `src/components/contact/contact-form.tsx` | Full name, email, subject, message |
| `src/components/partnerships/partnership-inquiry-form.tsx` | All partnership inquiry fields |

### Student portal
| File | Inputs reviewed |
|------|-----------------|
| `src/app/student/join/page.tsx` | Session code |
| `src/components/student/student-assignment-detail-client.tsx` | PDF file upload |
| `src/components/student/qr-scanner.tsx` | QR token (camera — read-only, server-validated) |

### Lecturer portal
| File | Inputs reviewed |
|------|-----------------|
| `src/components/lecturer/create-session-form.tsx` | Class name, title, course code, semester, academic year |
| `src/app/lecturer/sessions/[id]/assignments/create-assignment-form.tsx` | Title, description, deadline, max score |
| `src/components/lecturer/session-page-client.tsx` | Manual student name, college ID |
| `src/components/lecturer/ca-structure-panel.tsx` | CA weights, test title, max score |
| `src/components/lecturer/ca-weight-input.tsx` | Numeric weight (digit-only clamp) |
| `src/components/lecturer/assignment-grade-row.tsx` | Per-student grades |
| `src/components/lecturer/test-grade-row.tsx` | Per-student scores |
| `src/components/lecturer/attendance-session-panel.tsx` | Duration select (predefined options) |
| `src/components/lecturer/subscription-page-content.tsx` | Payment callback URL params |
| `src/components/lecturer/payment-checkout-flow.tsx` | Payment method selection (enum) |

### Admin portal
| File | Inputs reviewed |
|------|-----------------|
| `src/components/admin/admin-contact-table.tsx` | Search filter |
| `src/components/admin/admin-partnerships-table.tsx` | Email search filter |
| `src/components/admin/admin-subscriptions-table.tsx` | Email search filter |
| `src/components/admin/admin-site-logo-upload.tsx` | Image file upload |
| `src/components/admin/admin-landing-hero-upload.tsx` | Hero image file upload |
| `src/components/admin/admin-subscription-actions.tsx` | Plan/days selects (enum presets) |
| `src/components/admin/admin-actions.tsx` | Grant/extend/toggle presets |

### API routes (validation alignment)
| File | Change |
|------|--------|
| `src/app/api/profile/route.ts` | Shared `profileUpdateSchema`, sanitized error responses |
| `src/app/api/student/join/route.ts` | Shared `joinSessionSchema` |
| `src/app/api/lecturer/sessions/[id]/assignments/route.ts` | Shared `assignmentSchema` |
| `src/app/api/admin/grant-free/route.ts` | `adminGrantFreeSchema` |
| `src/app/api/admin/extend-subscription/route.ts` | `adminExtendSubscriptionSchema` |
| `src/app/api/admin/toggle-lecturer/route.ts` | `adminToggleLecturerSchema` |

### File handling & rendering
| File | Purpose |
|------|---------|
| `src/lib/assignments/submissions.ts` | Filename sanitization on PDF validation |
| `src/lib/assignments/storage.ts` | Path segment sanitization (pre-existing) |
| `src/lib/landing/site-branding.ts` | Client-side branding image validation helper |
| `src/components/pwa/pwa-head-links.tsx` | `dangerouslySetInnerHTML` — static bootstrap only (no user input) |
| `src/lib/errors/classify.ts` | Error message sanitization (pre-existing) |

---

## 2. Vulnerabilities Fixed

| Issue | Risk | Fix applied |
|-------|------|-------------|
| Missing max-length on text fields | DoS via oversized payloads, DB bloat | `FIELD_LIMITS` enforced on all shared schemas |
| No HTML/script stripping on text inputs | Stored XSS if content ever rendered unsafely | `sanitizeTextInput()` on all text fields via Zod transforms |
| Duplicate/inconsistent validation schemas | Client bypass, API inconsistency | Consolidated `profileUpdateSchema`, `assignmentSchema`, `joinSessionSchema` |
| Join class page — no client validation | Malformed codes sent to API | `joinSessionSchema` + `sanitizeSessionCode()` on input |
| Assignment creation — manual checks only | Weak validation, no description limits | Shared `assignmentSchema` with sanitization |
| Forgot password — HTML5 email only | Invalid emails submitted | `forgotPasswordSchema` + react-hook-form |
| Manual student add — ad-hoc min-length | Inconsistent with API | Shared `manualStudentSchema` |
| CA test creation — no schema on client | Unbounded title/score | `classTestSchema` before API call |
| Student PDF upload — `accept` only | Malicious files before server check | `validateSubmissionFile()` on client |
| Admin search fields — unsanitized | DOM XSS in filter logic (defense-in-depth) | `sanitizeSearchQuery()` on change |
| URL query params — unsanitized | DOM-based XSS via reflected params | `sanitizeQueryParam()` / `isAllowedPaymentCallbackFlag()` |
| Admin legacy API routes — no Zod | UUID/type coercion attacks | Dedicated admin Zod schemas |
| API error responses — raw DB messages | Information leakage | `sanitizeErrorMessage()` on profile/admin routes |
| Upload filenames — path traversal risk | Storage/path injection | `sanitizeFilename()` in submission validation |
| Branding uploads — client `accept` only | Invalid files sent to server | `validateBrandingImageFile()` before upload |
| Missing `transport.ts` / `cookies.ts` | Broken security module references | Restored from admin deploy templates |

---

## 3. Validation Rules Added

| Field / Schema | Rules |
|----------------|-------|
| **Email** (all forms) | Format validation, max 254 chars, trimmed + lowercased |
| **Password** | Min 6 (login) / 8 (signup, change), max 128 (no sanitization — preserves special chars) |
| **Full name** | Min 2, max 120, HTML stripped |
| **Phone** (profile) | Optional; min 6, max 30; digits/`+`-`()`/space only |
| **Phone** (partnerships) | Required; same format rules |
| **College ID** | Optional, max 50, sanitized text |
| **Session code** | 4–10 chars, uppercase alphanumeric only |
| **Course/session fields** | Per-field max lengths (title 200, course code 30, class 120, year 20) |
| **Assignment** | Title min 2 max 200, description max 10000, score 1–1000 integer |
| **Contact / partnership** | Message max 5000, subject max 200, notes max 5000 |
| **CA test** | Title max 120, score 1–1000 integer |
| **Admin actions** | UUID validation for lecturer/subscription IDs; days 1–3650 integer |
| **Search inputs** | Max 200 chars, sanitized |
| **File uploads** | PDF only ≤10 MB; branding images MIME whitelist ≤5 MB |

---

## 4. Sanitization Measures Added

| Function | Applied to |
|----------|------------|
| `sanitizeTextInput()` | All free-text Zod fields (names, messages, descriptions, subjects) |
| `sanitizeOptionalText()` | Optional text fields (college ID, notes, description) |
| `sanitizePhoneInput()` | Phone fields |
| `sanitizeSessionCode()` | Join-class session code input |
| `sanitizeSearchQuery()` | Admin table search boxes |
| `sanitizeQueryParam()` | Auth error/message URL params |
| `isAllowedPaymentCallbackFlag()` | Subscription payment success/cancel params |
| `sanitizeFilename()` | PDF submission file names |
| `stripHtml()` / script pattern removal | Embedded in `sanitizeTextInput()` |

**Secure rendering:** No unsafe changes required. User-generated content (assignment descriptions, contact messages) is rendered via React text nodes (`{value}`), which auto-escapes HTML. The only `dangerouslySetInnerHTML` usage is static PWA bootstrap scripts — not user-controlled.

**Error handling:** API and form errors use `sanitizeErrorMessage()` to avoid leaking stack traces, SQL, or internal paths.

---

## 5. Remaining Security Concerns

| Concern | Severity | Notes |
|---------|----------|-------|
| No Content-Security-Policy header | Medium | Relies on React escaping + `X-Frame-Options`. Consider adding CSP in `next.config.ts` in a future pass. |
| Regex-based HTML sanitization (no DOMPurify) | Low | Sufficient for text-field storage; React rendering is primary XSS defense. DOMPurify recommended if rich-text editing is added. |
| SVG branding uploads allowed | Low | SVG can embed scripts; mitigated by serving via `<Image>` / storage URL, not inline SVG. Consider disallowing SVG if inline rendering is ever introduced. |
| CA weights sum ≠ 100 | Low | Business rule, not a security issue; server accepts any 0–100 combination. |
| Attendance scan lat/long not schema-validated | Low | Server-side token verification is primary control. |
| `deploy/lectrax-admin/` export not updated | Info | Separate deploy artifact; re-export via `npm run export:admin` to sync. |
| Rate limiting | Info | No client-side rate limits; relies on Supabase/auth and infrastructure. |
| Webhook body parsing (`monime`) | Info | Signature verification expected separately; outside frontend scope. |

---

## 6. Verification

- `npm run typecheck` — **passes**
- All existing form flows preserved (same UI, same API contracts, same user messages where validation previously passed)
- Stricter validation only rejects previously-invalid or malicious input

---

## 7. Architecture Summary

```
User input → sanitize (on change or submit) → Zod schema (client)
          → API route Zod safeParse (server) → Supabase / storage
          → React text rendering (escaped output)
          → sanitizeErrorMessage (errors)
```

Shared validation lives in `src/lib/validations.ts` and `src/lib/security/` to avoid schema drift between client forms and API routes.
