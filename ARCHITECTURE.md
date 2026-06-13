# Lectrax Architecture

## Site Map

```
/                          Landing page
/pricing                   Subscription pricing (lecturers)
/login                     Sign in
/signup                    Register (lecturer | student)
/forgot-password           Password reset
/auth/callback             Supabase OAuth / email verification

/lecturer                  Lecturer dashboard
/lecturer/sessions         All class sessions
/lecturer/sessions/new     Create session
/lecturer/sessions/[id]    Session management (tabs: students, attendance, assignments, CA, audit)
/lecturer/sessions/[id]?tab=audit   Session audit log (inline tab)
/lecturer/sessions/[id]/assignments
/lecturer/analytics        Charts & insights
/lecturer/subscription     Pay / view plan

/student                   Student dashboard
/student/join              Join via session code
/student/scan              QR attendance scanner
/student/assignments       Submit assignments

/admin                     Platform admin dashboard
/admin/lecturers           Manage lecturers + free plans
/admin/subscriptions       All subscriptions
/admin/analytics           Platform analytics
/admin/audit               Global audit logs
```

## Feature List

| Area | Features |
|------|----------|
| Auth | Signup, login, logout, forgot password, email verification, RBAC middleware |
| Classes | Auto session code, multi-tenant RLS, semester/year separation |
| Attendance | Expiring QR, HMAC tokens, duplicate prevention, device fingerprint, manual mark |
| CA | Configurable weights, auto attendance/assignment/test calculation |
| Assignments | Create, deadline, Supabase Storage submissions, grading |
| Subscriptions | Monime checkout, webhooks, feature gating for lecturers |
| Admin | Free plan override, revenue, audit logs, analytics |

## Component Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
├── components/
│   ├── ui/                 # shadcn-style primitives
│   ├── layout/             # Logo, headers, sidebar, shell
│   ├── auth/               # Login/signup forms
│   ├── lecturer/           # Session management
│   ├── student/            # QR scanner
│   ├── admin/              # Admin actions
│   └── shared/             # StatCard, EmptyState
├── hooks/                  # useProfile
├── lib/                    # Supabase, CA math, QR tokens, Monime, audit
├── store/                  # Zustand auth store
└── types/                  # TypeScript domain types
```

## API Routes

- `POST /api/attendance/start` — Generate QR session
- `POST /api/attendance/scan` — Student marks attendance
- `POST /api/attendance/manual` — Lecturer manual mark
- `POST /api/payments/checkout` — Monime checkout
- `POST /api/webhooks/monime` — Payment webhook
- `POST /api/admin/grant-free` — Admin free plan

## Database (14 tables)

profiles, class_sessions, enrollments, attendance_sessions, attendance_records,
assignments, submissions, test_scores, ca_configurations, audit_logs,
subscriptions, payments, manual_students, device_registrations
