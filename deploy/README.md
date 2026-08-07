# Lectrax platform-admin deployment

The standalone admin app is maintained in a **separate GitHub repository**:

https://github.com/hardenmcforay-debug/Admin.Lectrax

This folder can hold a local export generated from the main Lectrax app, but
`deploy/lectrax-admin/` is gitignored here and is not part of the main app remote.

## Architecture

| Deployment | Domain example | Env |
|------------|----------------|-----|
| Main app (lecturers + students) | `https://lectrax.app` | `NEXT_PUBLIC_ADMIN_APP_URL=https://admin.lectrax.app` |
| Admin app (platform admin only) | `https://admin.lectrax.app` | `NEXT_PUBLIC_DEPLOYMENT_TARGET=admin` |

Both apps share the **same Supabase project**. Platform admins sign in only on the admin domain.

## Generate / refresh export

From the main repository root:

```bash
npm run export:admin
```

That writes a standalone Next.js app to `deploy/lectrax-admin/`.

## Push updates to the admin repository

```bash
npm run export:admin
cd deploy/lectrax-admin
git add .
git commit -m "Sync admin export from main app"
git push origin master
```

If the folder is not already a clone of Admin.Lectrax:

```bash
cd deploy/lectrax-admin
git init
git remote add origin https://github.com/hardenmcforay-debug/Admin.Lectrax.git
git fetch origin
git checkout -B master origin/master
```

Then re-run `npm run export:admin`, commit, and push.

## Admin app environment

Copy `.env.example` to `.env.local` in `deploy/lectrax-admin/` (or in the Admin.Lectrax clone):

```env
NEXT_PUBLIC_DEPLOYMENT_TARGET=admin
NEXT_PUBLIC_APP_URL=https://admin.lectrax.app
NEXT_PUBLIC_MAIN_APP_URL=https://lectrax.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Optional production hardening:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
CSP_MODE=report-only
```

## Local admin development

```bash
cd deploy/lectrax-admin
npm install
cp .env.example .env.local
npm run dev
```

The admin app defaults to port `3001`.
