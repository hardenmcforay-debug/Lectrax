# File Upload Security Review Report

**Application:** Lectrax (Next.js 15 + Supabase, Vercel)  
**Date:** June 18, 2026  
**Scope:** All user-controlled file uploads, Supabase Storage buckets, download authorization, validation, and abuse controls  
**Constraint:** No UI/UX/business-logic changes except security hardening  
**Builds on:** `API_ENDPOINT_SECURITY_REPORT.md`, `DDoS_SECURITY_REPORT.md`, `RATE_LIMITING_SECURITY_REPORT.md`

---

## Executive Summary

Lectrax has a **small, well-scoped upload surface**: student assignment PDF submissions (private bucket) and platform-admin branding images (public bucket). There are **no profile image uploads**, **no course-material uploads**, **no spreadsheet imports**, and **no lecturer document uploads** in the current codebase.

This review audited every upload path, Supabase Storage policy, and download authorization flow. **Six security improvements** were applied without changing user-facing behavior for valid uploads:

1. **PDF magic-byte validation** — rejects MIME/extension-spoofed non-PDF files before storage upload  
2. **Blocked executable extension check** — explicit denylist on client and server validation paths  
3. **Sanitized storage error messages** — prevents Supabase/internal path leakage on upload failures  
4. **Sanitized `file_name` metadata** — path traversal and special characters stripped before DB insert  
5. **Branding extension ↔ MIME alignment** — rejects extension/MIME mismatches (spoofing mitigation)  
6. **SVG script/event-handler screening** — blocks malicious SVG logos before public bucket upload  
7. **Expanded rejection audit logging** — validation failures logged (filename only, not file contents)

Existing controls (private assignment bucket, signed URLs, RLS, server-generated storage paths, middleware body limits, rate limits) were already strong. **Remaining risks** are documented below, chiefly advanced SVG payloads and lack of raster image magic-byte validation for branding uploads.

---

## 1. Upload Locations Reviewed

| # | Feature | Client entry | API route | Storage bucket | Public? | Max size |
|---|---------|--------------|-----------|----------------|---------|----------|
| 1 | Student assignment PDF | `student-assignment-detail-client.tsx` | `POST /api/student/assignments/[assignmentId]/submit` | `assignment-submissions` | No | 10 MB |
| 2 | Site logo (admin) | `admin-site-logo-upload.tsx` | `POST /api/admin/site-logo` | `landing-assets` | Yes | 5 MB |
| 3 | Landing hero image (admin) | `admin-landing-hero-upload.tsx` | `POST /api/admin/landing-hero` | `landing-assets` | Yes | 5 MB |

### Explicitly not uploads (reviewed, out of scope)

| Feature | Notes |
|---------|-------|
| Profile images | No upload UI or API found |
| Course materials | Not implemented |
| Spreadsheet import | Not implemented; `export-student-performance` generates Excel server-side |
| Admin CSV/data import | Not implemented |
| Direct Supabase client uploads | All uploads go through authenticated API routes |

### Download / access paths reviewed

| Path | Authorization |
|------|---------------|
| `GET /api/student/assignments/[assignmentId]/download` | `requireStudentRole()` + own `assignment_submissions` row |
| `GET /api/lecturer/sessions/[id]/assignments/[assignmentId]/submissions/download` | Lecturer role + owns assignment + UUID-validated `enrollmentId` |
| Public landing images | `landing-assets` bucket is public-read; paths are fixed (`brand/logo.*`, `hero/landing.*`) |

---

## 2. File Type Validation

### Assignment submissions (PDF only)

| Layer | Control |
|-------|---------|
| Client `accept` | `application/pdf,.pdf` |
| `validateSubmissionFile()` | Extension `.pdf`, MIME `application/pdf`, size ≤ 10 MB, blocked extension denylist |
| **New:** `hasPdfMagicHeader()` | Requires `%PDF-` at file start (server, before upload) |
| Supabase bucket | `allowed_mime_types = ['application/pdf']`, `file_size_limit = 10485760` |

### Branding images

| Layer | Control |
|-------|---------|
| Client `accept` | JPEG, PNG, WebP, GIF; logo also allows SVG |
| `isAllowedBrandingImage()` | MIME allowlist + 5 MB cap |
| **New:** `brandingExtensionMatchesMime()` | Extension must match declared MIME |
| **New:** `isSafeSvgContent()` | Rejects `<script>`, event handlers, `javascript:`, `<foreignObject>` in SVG logos |
| Supabase bucket | Logo: JPEG/PNG/WebP/GIF/SVG; Hero: JPEG/PNG/WebP/GIF (migration `035` extends logo MIME list) |

### Gaps (remaining)

- Branding raster images are not magic-byte verified (JPEG/PNG/WebP/GIF signatures). Mitigated by MIME allowlist + bucket `allowed_mime_types` + admin-only upload.
- PDF validation does not scan for embedded JavaScript or malformed PDF structures (would require a dedicated PDF parser/antivirus).

---

## 3. File Size Restrictions

| Upload | App limit | Middleware body limit | Bucket limit |
|--------|-----------|----------------------|--------------|
| Assignment PDF | 10 MB (`MAX_SUBMISSION_FILE_SIZE`) | 12 MB (`MAX_FILE_UPLOAD_BODY_BYTES`) | 10 MB |
| Branding image | 5 MB (`BRANDING_IMAGE_MAX_BYTES`) | 6 MB (`MAX_BRANDING_UPLOAD_BODY_BYTES`) | 5 MB |

Middleware rejects oversized requests via `Content-Length` before handlers run (`request-limits.ts`). Client and server both enforce file-level size checks.

---

## 4. Filename Security

| Concern | Mitigation |
|---------|------------|
| Path traversal | `sanitizeFilename()` strips `/`, `\`, `..`, reserved chars; used for display metadata |
| User-controlled storage paths | **Not used** — paths are server-generated |
| Assignment path | `buildSubmissionStoragePath()` uses `sanitizePathSegment()` on all segments; fixed `.pdf` suffix |
| Branding path | `buildSiteLogoStoragePath(ext)` / `buildHeroImageStoragePath(ext)` — extension from validated MIME only |

**Improvement applied:** `file_name` in `assignment_submissions` now stores `sanitizeFilename(params.file.name)` instead of raw client filename.

---

## 5. Malicious File Protection

| Threat | Status |
|--------|--------|
| Executables (`.exe`, `.bat`, `.js`, `.php`, etc.) | Blocked by PDF-only + **new** `hasBlockedUploadExtension()` denylist |
| Scripts disguised as PDF | **New** magic-byte check; bucket MIME enforcement |
| Double extensions (`report.pdf.exe`) | Denylist catches trailing dangerous extension |
| SVG XSS in public bucket | **New** `isSafeSvgContent()` on logo upload; logos served from public CDN |
| HTML/uploaded web shells | No HTML upload paths; assignment bucket PDF-only |

---

## 6. Storage Security

### `assignment-submissions` (private)

- `public = false`
- Access via **signed URLs** (`getSignedSubmissionUrl`, 1-hour expiry) or authenticated storage policies
- Path structure: `{year}/{semester}/{course}/{assignmentId}/{studentId}.pdf`
- RLS helpers: `student_owns_submission_storage_path`, `lecturer_owns_submission_storage_path`

### `landing-assets` (public)

- `public = true` — intentional for marketing site performance
- Only **platform admins** may INSERT/UPDATE/DELETE (`is_platform_admin()`)
- Fixed object keys — admins cannot choose arbitrary paths
- Old assets removed on replacement upload

---

## 7. Authorization Checks

| Action | Guard |
|--------|-------|
| Submit assignment | `requireStudentRole()`, enrolled in class, published assignment, before deadline, no duplicate submission, premium feature gate |
| Download own submission | Student role + `student_id = auth.uid()` |
| Download student submission (lecturer) | Lecturer role + owns assignment + valid enrollment UUID |
| Upload/delete branding | `requirePlatformAdmin()` |
| Direct storage API | Supabase RLS on `storage.objects` enforces ownership/admin rules |

**Finding:** Authorization is consistently enforced at API layer and mirrored in storage policies. Students cannot read other students' files; lecturers cannot download submissions for classes they do not own.

---

## 8. Metadata and Content Review

| Item | Handling |
|------|----------|
| `file_name` | Sanitized before DB insert; returned in download JSON for display |
| `file_size` | From client `File.size`; bucket enforces actual stored size |
| `storage_path` | Server-generated only; never accepted from client |
| Audit logs | Rejection logs include `fileName` and `reason` — **not** file bytes |
| Spreadsheet metadata | N/A — no imports |

---

## 9. Logging and Monitoring

| Event | Mechanism |
|-------|-----------|
| Deadline-blocked submission | `assignment_submission_rejected` audit (`reason: deadline_passed`) |
| **New:** Validation-blocked submission | Same audit action (`reason: validation_failed`) |
| Rate limit violations | `console.warn` via rate-limit middleware (IP only) |
| Branding upload failures | Generic sanitized API errors |

**Not logged:** Successful upload contents, file buffers, signed URL tokens.

---

## 10. Error Handling

| Area | Behavior |
|------|----------|
| Assignment upload errors | **Improved:** `sanitizeErrorMessage()` on storage/DB errors |
| Branding upload errors | Already used `sanitizeErrorMessage()` |
| Validation errors | User-friendly static messages (no internal paths) |
| Download failures | Generic "Submission not found" / "Could not generate download link" |

---

## 11. Security Testing (manual test matrix)

Recommended verification in staging:

| Test | Expected result |
|------|-----------------|
| Upload `.exe` renamed to `.pdf` | Rejected (extension denylist or magic-byte) |
| Upload JPEG with `Content-Type: application/pdf` | Rejected (magic-byte or MIME mismatch) |
| Upload 11 MB PDF | Rejected (client + middleware + bucket) |
| Filename `../../etc/passwd.pdf` | Sanitized metadata; storage path unchanged |
| Student downloads another student's submission | 404 / not found |
| Lecturer downloads with invalid `enrollmentId` | 400 Invalid enrollmentId |
| Non-admin POST to `/api/admin/site-logo` | 403 |
| SVG logo with `<script>alert(1)</script>` | 400 disallowed content |
| PNG file renamed `.jpg` with `image/png` MIME | 400 extension mismatch |
| Rapid assignment submits | 429 after rate limit (15 / 15 min) |

---

## 12. Supabase Storage Review

### Bucket permissions summary

| Bucket | Public read | Write | MIME enforcement | Size limit |
|--------|-------------|-------|------------------|------------|
| `assignment-submissions` | No | Student insert own path; lecturer read/delete class paths | `application/pdf` | 10 MB |
| `landing-assets` | Yes (world) | Platform admin only | Image types per migration | 5 MB |

### Policy findings

- Assignment bucket policies correctly tie storage object names to student UUID (segment 5) and assignment UUID (segment 4) for lecturers.
- Landing bucket public read is **by design**; write restricted to platform admins.
- `site_settings` RLS: public read, admin write — stores storage path metadata only.

### Migration references

- `020_assignment_submission_storage.sql` — assignment bucket + RLS
- `034_landing_hero_image.sql` — landing-assets bucket + admin policies
- `035_landing_logo_svg.sql` — adds `image/svg+xml` to logo bucket MIME list

---

## Vulnerabilities Discovered and Remediation

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| FU-01 | Medium | PDF accepted on MIME/extension only — spoofed non-PDF could be stored | **Fixed** — `hasPdfMagicHeader()` |
| FU-02 | Low | Raw Supabase error messages on assignment upload failure | **Fixed** — `sanitizeErrorMessage()` |
| FU-03 | Low | Unsanitized `file_name` in database metadata | **Fixed** — `sanitizeFilename()` |
| FU-04 | Medium | SVG logos in public bucket — stored XSS risk | **Mitigated** — `isSafeSvgContent()` screening |
| FU-05 | Low | Branding uploads trusted MIME without extension cross-check | **Fixed** — `brandingExtensionMatchesMime()` |
| FU-06 | Low | Validation rejections not audit-logged | **Fixed** — `validation_failed` audit entries |
| FU-07 | Info | Hero route uses shared `isAllowedBrandingImage()` which includes SVG MIME, but hero bucket disallows SVG | **Accepted** — Supabase rejects at upload; optional future hardening: separate hero allowlist |
| FU-08 | Info | No antivirus / deep PDF inspection | **Open** — recommend ClamAV or cloud scanning if threat model requires |

---

## Security Improvements Applied (code)

| File | Change |
|------|--------|
| `src/lib/security/file-validation-shared.ts` | **New** — blocked extensions, branding extension/MIME check (client-safe) |
| `src/lib/security/file-validation.ts` | **New** — PDF magic bytes, SVG safety (server-only) |
| `src/lib/assignments/submission-validation.ts` | Blocked extension denylist |
| `src/lib/assignments/submissions.ts` | Magic-byte check, sanitized errors, sanitized `file_name`, upload `fileBytes` |
| `src/lib/landing/branding-image-validation.ts` | Extension/MIME alignment in client validation |
| `src/app/api/admin/site-logo/route.ts` | Extension check, SVG screening |
| `src/app/api/admin/landing-hero/route.ts` | Extension check |
| `src/app/api/student/assignments/[assignmentId]/submit/route.ts` | Audit log for validation failures |

---

## Remaining Risks

1. **SVG hardening is heuristic** — complex SVG attacks (external entities, CSS expressions in older browsers) may bypass regex checks. Safest option long-term: disallow SVG or rasterize server-side.
2. **No magic-byte validation for raster branding images** — low risk given admin-only upload and bucket MIME limits.
3. **Public `landing-assets` bucket** — any object in the bucket is world-readable; compromise of platform admin credentials exposes upload capability to the marketing surface.
4. **PDF malware** — Lectrax validates format, not malicious PDF content; lecturers opening submissions should use standard malware precautions.
5. **`deploy/lectrax-admin` copy** — separate admin deployment tree may lag main app security modules; sync before deploying that package.

---

## Recommendations for Further Hardening

1. Add raster image magic-byte validation (`file-type` or similar) for branding uploads.
2. Consider removing SVG support and accepting only PNG/WebP for logos, or serve logos through an image proxy that strips active content.
3. Integrate optional virus scanning (ClamAV Lambda, Supabase Edge Function + scanner) for assignment PDFs.
4. Add automated tests for `hasPdfMagicHeader`, `isSafeSvgContent`, and `brandingExtensionMatchesMime`.
5. Sync `deploy/lectrax-admin` upload routes with main app hardening before next admin deploy.
6. Set Supabase Storage CORS to application origins only (dashboard configuration).
7. Monitor `assignment_submission_rejected` audit volume for abuse patterns.

---

## Verification

```bash
npm run typecheck
npm run build
```

---

*End of report.*
