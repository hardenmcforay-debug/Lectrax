# Lectrax Scalability Validation (k6)

Complete load-testing pack to validate Lectrax toward **100,000 concurrent users** while preserving performance and data integrity.

## What’s included

| Path | Purpose |
|------|---------|
| `k6/scenarios/01-smoke.js` … `10-mixed-production.js` | Flow-specific load scripts |
| `k6/config/stages.js` | Scale profiles: 100 → 100,000 VUs |
| `k6/config/thresholds.js` | SLO thresholds (smoke / standard / strict / soak) |
| `k6/lib/*` | Auth cookies, CSRF, metrics, device IDs, PDF upload helper |
| `k6/tools/attendance-token-feed.mjs` | Live QR token feed for sustained attendance tests |
| `k6/run.ps1` / `k6/run.sh` | One-command runners |
| `k6/data/users.example.json` | Sample credentials file |

**Tooling:** [k6](https://k6.io) (preferred). Artillery is not required; the same scenarios can be ported later if needed.

---

## Prerequisites

1. Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
2. Staging Lectrax deployment (never blast production first).
3. Upstash Redis configured on the target (`UPSTASH_REDIS_REST_*`) so rate limits behave like production.
4. Seeded users (thousands for high SCALE), class session, enrollments, assignment.
5. Copy env:

```bash
cp loadtests/k6/.env.example loadtests/k6/.env
cp loadtests/k6/data/users.example.json loadtests/k6/data/users.json
# edit users.json with real staging accounts
```

6. Confirm smoke path:

```powershell
.\loadtests\k6\run.ps1 -Scenario 01-smoke -Scale 100
```

---

## Scale matrix

| SCALE | Peak VUs | Typical duration | Generator |
|------:|---------:|------------------|-----------|
| 100 | 100 | ~10m | Single machine |
| 500 | 500 | ~20m | Single machine |
| 1,000 | 1,000 | ~25m | Single beefy machine |
| 5,000 | 5,000 | ~40m | Multi-core + high bandwidth |
| 10,000 | 10,000 | ~40m | Distributed k6 recommended |
| 50,000 | 50,000 | ~65m | **k6 Cloud / distributed required** |
| 100,000 | 100,000 | ~90m | **k6 Cloud / distributed required** |

For `SCALE=50000` or `100000`, set:

```bash
ALLOW_DISTRIBUTED_SCALE=true
```

Without that flag, scripts **cap at 1,000 VUs** so a laptop cannot accidentally open 100k connections.

---

## Scenarios

| Script | Tests | Key env |
|--------|-------|---------|
| `01-smoke` | `/api/live`, `/api/ready`, `/api/health` | `BASE_URL` |
| `02-auth` | Login + role | `USERS_FILE` |
| `03-qr-attendance` | Scan stampede / sustained via token feed | `CLASS_SESSION_ID`, lecturer creds |
| `04-dashboard` | Portal HTML + notifications / student-rows | `CLASS_SESSION_ID` |
| `05-assignment-submit` | Multipart PDF submit | `ASSIGNMENT_ID` |
| `06-grade-publish` | Bulk grades PUT | `CLASS_SESSION_ID`, `ASSIGNMENT_ID`/`TEST_ID`, `ENROLLMENT_IDS` |
| `07-payment` | Checkout (+ status); dry-run by default | `PAYMENT_DRY_RUN=true` |
| `08-file-upload` | Upload stress | `ASSIGNMENT_ID` |
| `09-analytics` | student-rows (+ optional export) | `CLASS_SESSION_ID` |
| `10-mixed-production` | Weighted production mix | fixtures above |

### QR attendance (two modes)

**Burst (default)** — start a session in `setup`, many VUs scan the same token within the 5s window. Best for uniqueness / RPC contention.

**Sustained** — run the token feed, then point k6 at it:

```powershell
node loadtests/k6/tools/attendance-token-feed.mjs
# other terminal:
$env:TOKEN_FEED_URL="http://127.0.0.1:9091/"
.\loadtests\k6\run.ps1 -Scenario 03-qr-attendance -Scale 1000
```

---

## Metrics collected (k6)

| Metric | Meaning |
|--------|---------|
| `http_req_duration` | Response time (p95/p99 via thresholds) |
| `http_reqs` | Throughput |
| `lectrax_*_latency` | Per-flow latency trends |
| `lectrax_http_error_rate` | Application error rate (4xx/5xx; 429 optional) |
| `lectrax_timeout_rate` | Timeouts |
| `lectrax_rate_limited_total` | 429 count (expected under abuse limits) |
| `lectrax_integrity_errors_total` | Failed auth / integrity checks |

### Infra metrics (outside k6 — required for full validation)

| Signal | Where |
|--------|-------|
| CPU / memory (Next.js) | Vercel Observability / host metrics |
| DB latency / slow queries | Supabase Dashboard → Query Performance |
| Connection count | Supabase → Database → Roles / pg_stat_activity |
| Redis latency | Upstash console |
| Edge / function duration | Vercel Analytics |
| Error spikes | Sentry |

Wire these during every run ≥1k VUs. k6 alone cannot see Postgres or Vercel CPU.

---

## Recommended run order

1. `01-smoke` @ 100  
2. `02-auth` @ 100 → 500 (watch IP login limits)  
3. `04-dashboard` @ 500 → 1k  
4. `09-analytics` @ 100 → 500 (heavy queries)  
5. `03-qr-attendance` burst @ 100 → 1k → 5k  
6. `05` / `08` uploads @ 100 → 500  
7. `06-grade-publish` @ 50 → 200 lecturers (few writers)  
8. `07-payment` dry-run @ 100  
9. `10-mixed-production` @ 1k → 5k → 10k  
10. Distributed: mixed + attendance @ 50k → 100k  

Record each run’s JSON under `k6/results/`.

---

## Rate limits (will appear as “bottlenecks”)

Production limits are intentional. Under load you **will** see 429s from a single IP:

| Surface | Approx limit |
|---------|----------------|
| Login per IP | 30 / 15m |
| Attendance scan per IP | 40 / min |
| Scan per user / device | 25–30 / min |
| Assignment submit | 15 / 15m (IP), 10 / 15m (user) |
| Grades | 30 / min |
| Checkout | 20 / 15m |

For capacity tests (not abuse tests):

- Spread traffic across many source IPs (k6 Cloud), **or**
- Temporarily raise staging policies in `src/lib/security/rate-limit-policies.ts`, **or**
- Set `ALLOW_RATE_LIMITS=true` (default) so 429s are not counted as hard failures.

Distinguish **protection 429** from **platform 5xx/timeouts**.

---

## Expected first bottlenecks (Lectrax architecture)

Ordered by likelihood as SCALE grows:

1. **Auth login rate limits / Supabase Auth** — single-IP login storms; Auth API RPS and GoTrue CPU.  
2. **Postgres connection saturation** — Vercel serverless × Supabase pooler (use **Supavisor transaction mode** / pooled URL).  
3. **QR scan write contention** — `UNIQUE (attendance_session_id, enrollment_id)` + `mark_attendance_from_verified_scan` row locks on `attendance_sessions`.  
4. **Upstash Redis** — every request hits distributed rate limit; Redis latency adds to p95.  
5. **student-rows / analytics** — heavy joins under concurrent lecturers; CPU-bound SQL.  
6. **Assignment PDF upload** — body size, antivirus, storage I/O, Vercel payload limits.  
7. **Vercel serverless concurrency / cold starts** — region concurrency caps, queueing → timeouts.  
8. **Monime / external payment APIs** — third-party RPS (keep dry-run for pure app tests).

### Scaling limits (planning targets)

| Layer | Soft limit without tuning | Hardening |
|-------|---------------------------|-----------|
| Single Vercel region | Thousands of concurrent serverless executions | Multi-region, larger plan, reduce SSR work |
| Supabase free/pro direct conns | Low hundreds | PgBouncer/Supavisor, fewer queries per request |
| Live QR classroom | Class size × 1 scan; refresh 1 lecturer | Already optimized for burst scans; watch session row lock |
| Single k6 generator | ~5–10k VUs practical | k6 Cloud operators for 50k–100k |

---

## Recommendations

### Query optimisation

- Ensure hot paths use indexes from `045_performance_scaling.sql` and attendance uniqueness indexes.
- Profile `student-rows` with `EXPLAIN (ANALYZE, BUFFERS)` under load; materialize CA aggregates if p95 > 1.5s at 500 lecturers.
- Avoid N+1 in dashboard RSCs; prefer single RPC/view for class performance tables.

### Caching

- Cache notification counts briefly (edge or Redis, 5–15s TTL).
- Cache lecturer session list / class metadata (short TTL, invalidate on write).
- Do **not** cache attendance mark results across users; do cache “session open?” reads carefully.

### Indexes

- Confirm: `attendance_records (attendance_session_id, enrollment_id)`, enrollments `(class_session_id, student_id)`, device registrations authority partial uniques, `attendance_device_transfers (student_id, transferred_at)`.
- Add covering indexes for student-rows filter/sort columns found slow in EXPLAIN.

### Database tuning

- Prefer **pooled** connection string for serverless.
- Raise `statement_timeout` only carefully; prefer faster queries.
- Monitor `pg_stat_statements` top total_time during each SCALE step.
- Partition / archive old attendance_records if tables exceed tens of millions of rows.

### Horizontal scaling

- Vercel: multiple regions closer to users; isolate admin app (already exportable).
- k6: distribute generators in-region with the app to avoid WAN RTT skewing latency.
- Supabase read replicas for analytics-heavy GET traffic (if available on plan).

### Connection pooling

- All Next.js server clients → pooler (transaction mode).
- Keep service-role usage minimal and connection-light in cron/webhooks.
- Cap concurrent heavy exports (`dataExport` already rate-limited).

### Integrity under load

- Attendance: expect many `409 ATTENDANCE_ALREADY_RECORDED` under duplicate scans — that is success for integrity.
- Grades: bulk PUT max 500; chunk larger classes in the client.
- Uploads: enforce one open submission path; treat 409 as idempotent replay.

---

## Production load-testing guide (checklist)

### Before

- [ ] Dedicated **staging** project (Supabase + Vercel preview/staging)
- [ ] Feature flags / Monime sandbox; `PAYMENT_DRY_RUN=true` unless testing payments
- [ ] Seed N users ≥ SCALE (unique emails/phones)
- [ ] Seed 1 large class (e.g. 5k enrollments) for attendance + analytics
- [ ] Notify team; enable Supabase query chart + Vercel observability + Sentry
- [ ] Snapshot DB (staging) in case of cleanup needs
- [ ] Confirm `QR_TOKEN_SECRET` and Redis configured

### During

- [ ] Run matrix in order; stop on sustained 5xx > 2% or timeout rate > 1%
- [ ] Capture: k6 summary, Vercel CPU/memory/concurrency, Supabase CPU/connections/slow queries, Upstash commands/latency
- [ ] For attendance: verify no duplicate present rows per enrollment (SQL check after run)
- [ ] Watch rate-limit 429 vs platform failure separately

### After

- [ ] Store `k6/results/*.json` + notes in the run log
- [ ] File bottlenecks with owner (API / SQL / Vercel / Supabase / Redis)
- [ ] Re-test after each remediation at the **same SCALE** before increasing
- [ ] Only then schedule a controlled production soak (read-heavy + dry-run payments), never a 100k write storm on prod payments/uploads

### Pass criteria (standard thresholds)

- p95 API &lt; 800ms (flow-specific thresholds in `config/thresholds.js`)
- Error rate &lt; 2% (excluding agreed 429s)
- Timeout rate &lt; 0.5%
- Zero duplicate attendance rows for the same `(session, enrollment)`
- No elevated Sentry fatal rate vs baseline

---

## npm scripts

```bash
npm run loadtest:smoke
npm run loadtest:auth -- 500
npm run loadtest:mixed -- 1000
```

(See root `package.json`.)

---

## Safety

- Do **not** run 10k+ destructive write tests against production.
- Do **not** disable CSRF or auth for load tests; scripts send `X-Lectrax-Request: 1` and real cookies.
- Do **not** commit `loadtests/k6/data/users.json` or `.env` with real passwords.
- Prefer synthetic staging data and cleanup jobs after large attendance/grade runs.
