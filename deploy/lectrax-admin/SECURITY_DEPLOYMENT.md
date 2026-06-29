# Lectrax Admin — Security Deployment Bundle

This admin deployment includes the following production security controls.

## Route & session protection

- Middleware session validation, CSRF checks, and API abuse filtering
- Role-based access for `/admin` pages and `/api/admin/*` routes
- `ProtectedSessionGuard` for PWA/bfcache session re-validation
- Secure logout with client storage purge and history-safe redirect
- Private `no-store` cache headers on authenticated routes

## API endpoint security

- `requirePlatformAdmin()` on all admin API handlers
- Sanitized database/error responses (`sanitizeErrorMessage`)
- Zod validation on admin mutation payloads
- Branded upload validation (MIME, size, optional antivirus scan)

## Platform hardening

- Content Security Policy, HSTS, frame denial, and permissions policy
- Service worker excludes authenticated HTML from offline cache
- Transaction-only audit log filtering on the admin dashboard

## Audit reports (included in this repo)

| Report | Focus |
|--------|--------|
| `API_ENDPOINT_SECURITY_REPORT.md` | API auth, IDOR, validation, error handling |
| `AUTHENTICATION_SECURITY_REPORT.md` | Login, session, password recovery |
| `AUTHORIZATION_SECURITY_REPORT.md` | Role guards, RLS alignment |
| `CSRF_SECURITY_REPORT.md` | Cross-site request forgery |
| `COOKIE_SECURITY_REPORT.md` | Session cookie settings |
| `DDoS_SECURITY_REPORT.md` | Abuse detection middleware |
| `ERROR_HANDLING_SECURITY_REPORT.md` | Information disclosure prevention |
| `FILE_UPLOAD_SECURITY_REPORT.md` | Upload validation and scanning |
| `HTTP_SECURITY_HEADERS_REPORT.md` | Response headers |
| `PASSWORD_RESET_SECURITY_REPORT.md` | Recovery flow hardening |
| `RATE_LIMITING_SECURITY_REPORT.md` | Rate limit policies |
| `SECRETS_SECURITY_REPORT.md` | Environment and key handling |
| `SERVER_SIDE_VALIDATION_SECURITY_REPORT.md` | Input validation |
| `SQL_INJECTION_SECURITY_REPORT.md` | Parameterized queries / RLS |
| `BROWSER_STORAGE_SECURITY_REPORT.md` | Client storage hygiene |
| `CONCURRENCY_SECURITY_REPORT.md` | Payment activation locking |
| `SECURITY_REVIEW_REPORT.md` | General security review |

## Deploy checklist

1. Set production env vars from `.env.example` (never commit secrets).
2. Apply Supabase migrations `042` and `043` if not already applied.
3. Confirm admin domain is listed in Supabase Auth redirect URLs.
4. Deploy from this repository's `master` branch.
