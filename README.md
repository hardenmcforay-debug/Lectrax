# Lectrax

**A Modern Academic Management Platform**

Lectrax helps lecturers and students manage attendance, assignments, assessments, and academic performance — built for universities, colleges, and schools.

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui patterns, Zustand, React Hook Form, Zod
- **Backend:** Supabase (Auth, PostgreSQL, RLS, Realtime, Storage, Edge Functions)
- **Charts:** Recharts
- **QR:** qrcode, html5-qrcode
- **Payments:** Monime (Orange Money, Afrimoney, wallets)
- **Deploy:** Vercel + Supabase Cloud

## Quick Start

### Prerequisites

- **Node.js 20+** (includes `npm`) — [nodejs.org](https://nodejs.org/) LTS installer
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional for migrations)
- Supabase project (cloud or local)

#### Windows: `npm` is not recognized?

That means Node.js is **not installed** (or not on your PATH). Cursor’s built-in `node.exe` does **not** include `npm`.

**Fix (pick one):**

1. **Installer (easiest)** — Download [Node.js LTS for Windows](https://nodejs.org/en/download/), run the `.msi`, keep “Add to PATH” checked, then **close and reopen** PowerShell.

2. **winget** — In PowerShell (approve the UAC admin prompt when it appears):
   ```powershell
   winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
   ```

3. **Project helper script:**
   ```powershell
   cd "C:\Users\C. FORAY\Desktop\WD\Smartroll"
   .\scripts\setup-windows.ps1
   ```

Verify in a **new** terminal:
```powershell
node --version
npm --version
```

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |
| `QR_TOKEN_SECRET` | Min 32 random chars for QR signing |
| `MONIME_*` | Payment integration (optional for dev) |

### 3. Database setup

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or run `supabase/migrations/001_initial_schema.sql` and `002_storage.sql` in the SQL editor.

### 4. Create platform admin

After first signup, promote a user in SQL:

```sql
UPDATE profiles SET role = 'platform_admin' WHERE email = 'admin@yourdomain.com';
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roles

| Role | Access |
|------|--------|
| **Platform Admin** | Lecturers, subscriptions, revenue, audit logs |
| **Lecturer** | Class sessions, attendance QR, assignments, CA, analytics (subscription required) |
| **Student** | Join classes, scan QR, submit assignments, view grades (always free) |

## Subscription Plans (Lecturers only)

| Plan | Price |
|------|-------|
| 1 Month | $5 |
| 3 Months | $15 |
| 6 Months | $30 |
| 12 Months | $60 |

Students never pay.

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for site map, features, and component layout.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Vercel deployment checklist, required environment variables, and post-deploy smoke tests.

Quick steps:

1. Import repository to Vercel
2. Add all environment variables from `.env.example`
3. Apply Supabase migrations to production
4. Configure Monime webhook and Supabase auth redirect URLs
5. Deploy and run smoke tests from `DEPLOYMENT.md`

## Security

- Row Level Security on all tables
- HMAC-signed expiring QR tokens
- Duplicate attendance prevention
- Device fingerprint registration
- Webhook signature verification (Monime)
- Role-based middleware routing

## License

Proprietary — Lectrax © 2026
