# Lectrax — Vercel Deployment Checklist

Use this checklist when deploying Lectrax to Vercel via GitHub.

## Pre-deploy (local)

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes (warnings only are acceptable)
- [ ] `npm run build` completes successfully
- [ ] Supabase migrations applied to production project
- [ ] `.env.local` is **not** committed (see `.gitignore`)

## Vercel project settings

| Setting | Value |
|---------|-------|
| Framework | Next.js (auto-detected) |
| Build Command | `npm run build` |
| Output Directory | `.next` (default) |
| Install Command | `npm install` |
| Node.js Version | 20.x |

Connect the GitHub repository and enable automatic deployments for your production branch.

## Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if needed).

### Supabase (required)

| Variable | Description | Expose to browser |
|----------|-------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://xxx.supabase.co`) | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server only** | No |

### Application (required)

| Variable | Description | Expose to browser |
|----------|-------------|-------------------|
| `NEXT_PUBLIC_APP_URL` | Production URL, e.g. `https://your-domain.com` | Yes |
| `QR_TOKEN_SECRET` | Random string, min 32 chars (QR attendance signing) | No |
| `CRON_SECRET` | Random string for cron authorization | No |

### Monime payments (required for lecturer subscriptions)

| Variable | Description | Expose to browser |
|----------|-------------|-------------------|
| `MONIME_API_KEY` | Monime API key | No |
| `MONIME_SPACE_ID` | Monime space ID | No |
| `MONIME_WEBHOOK_SECRET` | Webhook HMAC secret | No |
| `MONIME_CURRENCY` | Currency code, e.g. `SLE` | No |

Optional amount overrides: `MONIME_AMOUNT_MONTHLY`, `MONIME_AMOUNT_SEMESTER`, `MONIME_AMOUNT_ANNUAL`.

## Supabase production configuration

- [ ] Auth redirect URL: `https://your-domain.com/auth/callback`
- [ ] Site URL in Supabase Auth settings matches `NEXT_PUBLIC_APP_URL`
- [ ] All migrations in `supabase/migrations/` applied
- [ ] RLS policies enabled on all tables
- [ ] Storage buckets configured (site logo, hero images, assignment uploads)

## Monime webhook

- [ ] Webhook URL: `https://your-domain.com/api/webhooks/monime`
- [ ] Webhook secret matches `MONIME_WEBHOOK_SECRET`
- [ ] Test a sandbox payment before go-live

## Cron job

Vercel Cron is configured in `vercel.json` to call `/api/cron/subscription-lifecycle` daily at 06:00 UTC.

- [ ] `CRON_SECRET` is set in Vercel
- [ ] Cron job appears under Vercel → Cron Jobs after first deploy

## Post-deploy smoke tests

- [ ] Landing page loads
- [ ] Lecturer signup / login / logout
- [ ] Student signup / login / logout
- [ ] Session persistence after refresh
- [ ] Class creation and student enrollment
- [ ] QR attendance scan
- [ ] Manual attendance
- [ ] Assignment create / submit
- [ ] Test score entry and CA calculation
- [ ] Export functionality
- [ ] Subscription checkout (Monime)
- [ ] Contact and partnership forms
- [ ] Mobile navigation and PWA install prompt

## Security reminders

- Never commit `.env`, `.env.local`, or service role keys
- `SUPABASE_SERVICE_ROLE_KEY`, `MONIME_*`, `QR_TOKEN_SECRET`, and `CRON_SECRET` must remain server-only
- Rotate secrets if they were ever exposed
