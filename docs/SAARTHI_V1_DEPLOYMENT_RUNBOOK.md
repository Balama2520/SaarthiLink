# Saarthi V1 — Deployment Runbook

> Order of operations. Each step has a rollback path. **Never paste secrets into chat or commit them.**

**Target architecture (from PRODUCTION_ARCHITECTURE.md):**
- Frontend → Netlify (builds `frontend/dist`, CDN-hosted, SPA fallback)
- Backend → always-on cloud host of your choice (Docker)
- Database → Supabase PostgreSQL (source of truth, Alembic migrations)
- Files → Supabase Storage bucket `resumes` (private ACL, resume storage references)
- Cache → Upstash Redis (optional; missing = graceful degrade; never crash)
- AI → Google Gemini backend-only (GEMINI_API_KEY never to browser)
- DNS/HTTPS → Cloudflare (zone, CNAMEs, Full→Strict SSL, HSTS)

---

## Prerequisite (before you run step 1)

Collect **each value** below. Do not skip — Step 8 onwards needs them populated in environment panels.

**Step 0: Credentials & Values Collection Checklist** (user must provide all)

| # | Item | Example or where to copy | Status ☐ |
|---|---|---|---|
| 0.1 | **Production domain name** (zone you own in Cloudflare) | e.g. `saarthi.dev` | ☐ |
| 0.2 | **Admin username(s)** that will access `/admin` (comma separated; must match users you register in-app) | e.g. `saarthi_admin` | ☐ |
| 0.3 | **Always-on backend host** choice + credentials | Render / Railway / Fly.io / AWS EC2 (with SSH) / DigitalOcean / Heroku-dyno (note: Heroku sleeps on free tier — **use paid always-on**) | ☐ |
| 0.4 | **GitHub repo URL** (if not already pushed) | e.g. `github.com/yourorg/saarthi` | ☐ |
| 0.5 | Supabase project **Project Ref** | Dashboard → Project Settings → General → `Reference ID` (xxxxx.supabase.co host prefix) | ☐ |
| 0.6 | Supabase **Postgres connection string (pooler, transaction mode, port 6543)** | Dashboard → Project Settings → Database → `Connection string / URI / Pooler` (psycopg format, includes `?pgbouncer=true`) | ☐ |
| 0.7 | Supabase **SUPABASE_URL** (public project URL) | Project Settings → API → `Project URL` → e.g. `https://xxxx.supabase.co` | ☐ |
| 0.8 | Supabase **service_role key** (NOT anon key — bucket write access) | Project Settings → API → `service_role` → `reveal` | ☐ |
| 0.9 | Supabase Storage: **Is bucket `resumes` already created with Private ACL?** | Bucket → Create new bucket → name `resumes` → toggle "Public" OFF | ☐ |
| 0.10 | **Gemini API key** (Google AI Studio / Vertex AI) | ai.google.dev → API Keys → Create API Key | ☐ |
| 0.11 | **Upstash Redis URL** (optional; leave blank to run cache-less) | Upstash console → Redis DB → Connect → Redis URL with `rediss://user:pass@…` TLS | ☐ |
| 0.12 | Netlify **Personal Access Token** (for CI deploys, or do manual first deploy) | User Settings → Applications → Personal access tokens → New access token | ☐ |
| 0.13 | Cloudflare **API Token** with Zone.DNS + Zone.SSL edit scopes + **Zone ID** for your domain | Cloudflare Dashboard → My Profile → API Tokens | ☐ |
| 0.14 | Backend host static hostname or assigned subdomain from the provider | e.g. `saarthi-api.onrender.com` after first deploy | ☐ (can only fill after Step 5) |
| 0.15 | A strong **SECRET_KEY** (64+ chars — random, store in password manager or 1Password, never commit) | `python -c "import secrets; print(secrets.token_urlsafe(64))"` generated on your machine only | ☐ |

Got all 15 filled? Great. Continue.

---

## Phase 0: Machine & Repository Setup (0.5 h)

```bash
# 1. On your local machine (NOT in this sandbox — on your real host)
cd ~/code
git clone <your-github-url> saarthi && cd saarthi

# 2. Verify base tooling
python --version   # 3.11+
node --version     # 20 LTS+  (we used 22 in sandbox)
npm --version
docker --version   # needed for backend image build if host requires Dockerfile
```

```bash
# 3. Backend python venv (optional local sanity; not required for deploy)
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
# Verify import
python -c "import pdfplumber; from supabase import create_client; print('deps OK')"
cd ..

# 4. Frontend deps + local sanity
cd frontend
npm install
npm run lint   # expect exit 0
npm run build  # expect dist/ produced
cd ..
```

Rollback: delete venvs and node_modules and start over.

---

## Phase 1: Supabase — PostgreSQL + Storage (1 h)

### Step 1.1 PostgreSQL (Supabase)

1. Open your Supabase project → SQL Editor → New query.
2. Run `SELECT version();` — confirm Postgres ≥ 15.
3. **DO NOT** create tables by hand. Schema is owned by Alembic.
4. Copy the **pooled connection string (port 6543, Transaction mode, psycopg driver)** as `DATABASE_URL` value. It should end with `?pgbouncer=true`.

### Step 1.2 Storage bucket `resumes`

1. Dashboard → Storage → Create new bucket.
2. Bucket name: `resumes`.
3. Toggle **Public bucket**: OFF (Private ACL).
4. Click Create bucket.
5. (Optional, recommended) Add a bucket policy via SQL Editor → New query, paste:

```sql
-- Allow service_role key to write resumes bucket (already allowed by default via service_role)
-- Restrict downloads to user's own objects via signing (server issues signed URLs server-side — no RLS needed for the bucket)
```

6. (Housekeeping only) If there are any pre-existing public bucket policies that allow anon `GET`, revoke them. We use signed URLs server-side only.

### Step 1.3 Run Alembic migrations against the real Supabase DB

This is the **single irreversible step** — once tables exist, they must be managed by Alembic only, never manual ALTERs.

```bash
cd backend

# Copy env example to a temporary deploy shell env
cp .env.example .env.prod-tmp

# EDIT .env.prod-tmp → paste ONLY the variables below for the migration session:
#   DATABASE_URL=<your pooled Supabase Postgres URI, pgbouncer=true>
#   DEBUG=False
#   SECRET_KEY=<your strong 64+ char value>  (required by settings validator)
#   (the rest can stay blank for migration run)

# Load into process env and run head
set -a && source .env.prod-tmp && set +a
alembic upgrade head

# Expected output: INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
#                    Will assume transactional DDL.
# INFO  [alembic.runtime.migration] Running upgrade  -> 558e39301e77, initial_ai_os_schema
# INFO  [alembic.runtime.migration] Running upgrade 558e39301e77 -> 06e519b97e2b, add_job_ecosystem_phase1
# INFO  [alembic.runtime.migration] Running upgrade 06e519b97e2b -> 124d080d546c, extend_user_profile
# INFO  [alembic.runtime.migration] Running upgrade 124d080d546c -> b9f484181401, Add Resume versioning and status batch
# INFO  [alembic.runtime.migration] Running upgrade b9f484181401 -> 6297327ece39, Add ondelete CASCADE and RefreshToken
# (exit 0)
```

**Troubleshooting migration:**
- "permission denied for schema public" → Supabase Dashboard → Settings → Database → Pool modes / GRANT usage; ensure the DB user in the connection string is `postgres` or a user with CREATE on schema public. Supabase's pooled user typically is.
- "relation already exists" → you (or another tool) created tables manually. Drop that empty Supabase project and start a fresh one, or delete the manually-created tables first. Do NOT manually create tables after this runbook.

**Rollback:** `alembic downgrade -1` step-by-step until base. (Note: 5 migrations were written as collapsed baselines with early returns. Downgrade on a populated production DB is a destructive path — have a Postgres snapshot from Supabase UI → Database → Backups before running.)

---

## Phase 2: Backend deploy — always-on host (1 h)

Exact steps depend on 0.3 host choice. Pick **ONE** path. Dockerfile is already at [backend/Dockerfile](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/Dockerfile).

### Common — Environment Variables (set in the host's dashboard "Environment" panel, NOT in the Docker image)

Copy-paste each value from Step 0. **Do not quote values in the host env UI unless it says to.**

```
DEBUG=False
APP_NAME=Saarthi AI
VERSION=1.0.0
API_PREFIX=/api
SECRET_KEY=<0.15 value>
ALLOWED_ORIGINS=https://saarthi.example.com               ← your frontend URL (Step 0.1)
RATE_LIMIT_ENABLED=True
DATABASE_URL=<0.6 pooled Supabase URI>
REDIS_URL=<0.11 or BLANK>
SUPABASE_URL=<0.7>
SUPABASE_SERVICE_ROLE_KEY=<0.8>
STORAGE_BUCKET=resumes
GEMINI_API_KEY=<0.10>
GEMINI_MODEL=gemini-2.5-flash
OLLAMA_URL=
ADMIN_USERNAMES=<0.2 comma-separated admin usernames>
```

### Path A — Render (example)
1. New → Web Service → Connect your saarthi GitHub repo.
2. Root Directory: `backend`.
3. Runtime: **Docker** (it will auto-detect backend/Dockerfile).
4. Environment → paste the block above.
5. Region: close to your Supabase region for low DB latency.
6. Instance size: Starter or Pro plan (at least 512 MB RAM for 2 uvicorn workers). **Enable "Always ON" (not free instance).**
7. Click Create Service.
8. After deploy → copy the **onrender.com hostname** (e.g. `saarthi-api.onrender.com`). Save it as 0.14.
9. Smoke test from your laptop browser: `https://saarthi-api.onrender.com/api/health` → expect JSON with `status: "ok"` OR `"degraded"` (degraded is OK if Redis empty). Health component `storage.status` should show `"ok"` (SUPABASE_URL set) with `"bucket":"resumes"`. `components.ai_gateway.status` → `"configured"`.

### Path B — Fly.io (example)
```bash
cd backend
fly launch --dockerfile Dockerfile --name saarthi-api --region bom
fly secrets set DEBUG=False SECRET_KEY=... DATABASE_URL=...  (paste every env key from the common block)
fly deploy
# After deploy → copy hostname = 0.14
fly open /api/health    # verify JSON
```

### Path C — Self-managed EC2 / VPS with docker compose
1. SCP the entire repo (or git clone) to the server.
2. `docker compose up -d` (root [docker-compose.yml](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/docker-compose.yml) may need env tweaks).
3. Attach a real HTTPS cert with caddy/nginx in front of uvicorn OR rely on Cloudflare SSL (origin certificate).
4. Smoke test: `curl -s http://server-ip:8000/api/health` → JSON.
5. Write 0.14 = server hostname or IP (for Cloudflare backend CNAME or A record).

### Path D — Railway / Heroku paid
Follow the Dockerfile deploy path; same env block.

---

## Phase 3: Netlify Frontend (30 min)

1. Netlify → Add new site → Import existing project → Connect saarthi GitHub repo.
2. **Site settings → Build & deploy → Continuous deployment → Build settings**:
   - Base directory: *(leave empty or repo root)*
   - Build command: `cd frontend && npm ci && npm run build`
   - Publish directory: `frontend/dist`
3. Deploy context → Production → Variables → set:
   ```
   VITE_API_BASE_URL=https://api.saarthi.example.com     ← Step 8 planned DNS (not backend direct hostname)
   NODE_VERSION=20
   ```
4. Save → Trigger deploy → Deploy production.
5. After success → copy Netlify **primary subdomain**, e.g. `saarthi-ai.netlify.app` — you need it for Phase 4 DNS.
6. At this point visiting the netlify.app URL directly shows the app but the API call will go to `api.saarthi.example.com` that does not yet exist (it will CORS-fail). That is expected — **finish Phase 4 before end-to-end testing**.

---

## Phase 4: Cloudflare DNS + HTTPS (30 min)

1. Cloudflare → your domain zone (Step 0.1) → DNS.
2. Add these records (turn on Proxy status = Proxied ☁️ for both):

| Type | Name | Target | Proxy status | TTL |
|---|---|---|---|---|
| CNAME | `@` (or `saarthi` if it's a subdomain zone) | `<netlify-primary-subdomain>` netlify.app (Phase 3 output) | Proxied | Auto |
| CNAME | `api` | `<backend-hostname-from-0.14>` (render.com / fly.dev / EC2 hostname) | Proxied | Auto |

3. Cloudflare → SSL/TLS → Overview → **Full** (do not use Flexible — backend host may not be ready for end-to-end cert; wait 30 min then promote to **Strict** once backend shows green origin cert).
4. Cloudflare → SSL/TLS → Edge Certificates →
   - Always Use HTTPS: ON
   - Automatic HTTPS Rewrites: ON
   - HSTS → Enable → Max Age = 12 months, Include subdomains = ON, Preload = OFF initially (wait 24 h then consider applying)
5. Cloudflare → Rules → Transform Rules → Response Headers (optional, already duplicated by backend middleware, add if you want extra edge enforcement)
   - Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - Add `X-Content-Type-Options: nosniff`
6. **BACKEND host env update** — update `ALLOWED_ORIGINS` (Phase 2) to include the final public frontend URL e.g. `https://saarthi.example.com` (and if you also want netlify.app direct for debugging, add it comma-separated). Redeploy backend to pick up new CORS origin list.

---

## Phase 5: E2E smoke (30 min — requires laptop STILL ON, before the laptop-off smoke)

From your laptop browser, **NOT while running any local dev server**.

1. `https://saarthi.example.com/` loads → see Landing / Register modal.
2. Register an admin username (exact match to `ADMIN_USERNAMES` env, case-sensitive). → Login.
3. Dashboard loads.
4. Profile → enter a Full Name + Target Role → save.
5. Profile completeness bar fills.
6. Resume Analyzer → upload a tiny `test.txt` resume file (≤ 5 MB, e.g. one line "John Doe — Python, SQL, Java") → click Analyze.
   - With valid Gemini: expect overall ATS score ring.
   - No valid key or key missing → expect no 500; upload should persist row with `parsing_status = failed`; history shows version 1.
7. Goals page → create a goal "Get job by December". Reload → persists.
8. **Admin panel** (as admin user) → Admin loads → stats endpoint returns 200.
9. Log out → Cookie/tokens cleared; re-click protected tab → back to auth modal.
10. Backend health via public DNS: `curl -s https://api.saarthi.example.com/api/health | python -m json.tool` → shows status ok/degraded.

**Any of steps 1–10 fail?** Debug and fix. Do not mark deployment done before steps 1–10 pass.

---

## Phase 6: Laptop-OFF smoke test (AC-16 — the real proof)

1. On your developer laptop:
   ```
   # Stop ALL local processes
   taskkill /F /IM python.exe      # Windows
   taskkill /F /IM node.exe
   # Close terminal windows. Shutdown Wi-Fi on the laptop.
   # Physically put the laptop to sleep (Win + L then Sleep) and leave it off for 10 minutes.
   ```

2. Use a **DIFFERENT device** (phone on cellular data, another desktop) — anything NOT the developer laptop.
3. On the other device:
   - Visit `https://saarthi.example.com` → page loads fast from Netlify CDN (cache hit on repeat load).
   - Register a NEW test user → Dashboard shows data.
   - Profile page: set a target role, save.
   - Upload a TXT resume → history shows row + version = 1 (do not worry about AI parsing right now — persistence alone is enough for the smoke).
   - Create one goal with description → refresh and confirm it persists (reload the whole page to prove DB round trip, not Zustand cache).
   - Open AI Chat → type "Hello" → either get streaming answer OR get graceful "AI unavailable" red bubble (no crash).
   - Logout → protected pages now redirect to auth modal.
4. All 7 sub-steps pass? → Deployment Fidelity rubric can be scored 2/2.

**If the smoke fails on the non-laptop device despite passing Phase 5:**
- Frontend blank = Netlify build env `VITE_API_BASE_URL` was set incorrectly → redeploy.
- API calls fail CORS = backend ALLOWED_ORIGINS missing the real frontend URL → update backend env, redeploy.
- 502 / 521 from Cloudflare → backend host env vars secret wrong (e.g. DATABASE_URL) causing uvicorn crash → check host logs, fix env, redeploy.
- 403 rate limit immediately = x-forwarded-for rate limiter is treating Cloudflare as one IP. Either: disable rate limit, OR trust Cloudflare connecting IP properly (see Phase 7 optional).

---

## Phase 7: Optional Hardening (1 h)

- **GitHub Environments + Secrets**: Store Netlify token, backend deploy tokens, Cloudflare token in GitHub Environment Secrets (not repo vars) for prod/staging.
- **Cloudflare rate limiting rule** (safer than the current in-app x-forwarded bucket): add a Cloudflare Rule → Rate Limiting for `/api/auth/*` at e.g. 5 requests / 10 min / IP to prevent credential stuffing.
- **Supabase DB Backups schedule**: Supabase already does daily PITR on paid — verify and keep enabled for 7+ days.
- **Supabase Storage lifecycle rule**: Add a lifecycle rule on bucket `resumes` → abort incomplete multipart uploads after 1 day; keep deleted object versions for 30 days.
- **Observability (basic)**: Point backend structured JSON logs to the host's log drain (Render logs → Logtail / Railway logs → Axiom / EC2 → Promtail + Grafana Loki or CloudWatch).

---

## Rollback Playbook (15 minutes, 99% of incidents)

If something breaks in production during an update:

1. **Frontend rollback (Netlify)**
   - Netlify → Deploys → previous successful deploy → Options → "Publish deploy". Done. Frontend reverts instantly (CDN cached, ~1 min propagation).

2. **Backend rollback (Docker host)**
   - Render / Railway / Fly: Rollback to the previous successful Deployment (one-click "Rollback" in most panels). Always tag images with a sha or incrementing version to know exactly what you're rolling back TO.
   - EC2 self-managed: `docker compose up -d <previous-image-sha>`.

3. **Database rollback (Alembic — ONLY during deploy incidents, NEVER for user data)**
   - NEVER run raw SQL ALTERs. If a migration broke things AND you have a pre-upgrade snapshot (always take before upgrade head):
     ```bash
     # Supabase first — restore the snapshot via UI then re-point the app to restored
     # Then alembic stamp head to match restored schema if needed
     alembic stamp <revision_id_before_mistake>
     ```

4. **DNS / Cloudflare emergency**: If all else fails and origin is down, you can temporarily route `api.*` to a maintenance page CNAME; flip Proxy status to DNS-only for debugging. Turn off HSTS temporarily only as absolute last resort (do not do it lightly — browsers remember it for months).

5. **Gemini outage / key invalidated**: Fallback path already exists. Users will see "AI temp unavailable" + resume uploads persist rows even if AI fails. Action = issue new key, update env, redeploy backend — no DB action needed.

6. **Upstash Redis down**: NO action required — health just shows degraded, all endpoints keep working via DB.
# 2026-09-09 release gate addendum

Do not deploy until all of these are demonstrated in the target environment:

1. Set Netlify's public `VITE_API_BASE_URL` to the real HTTPS FastAPI origin, deploy, then verify a browser request reaches `/api/health`. Alternatively, configure a same-origin reverse proxy; Vite's proxy is development-only.
2. Health reports Supabase storage configured and a private-bucket upload produces a recoverable object reference.
3. The tracked `backend/buddy-key.pem` and `backend/buddy-key-2025.pem` have been rotated/revoked if active and removed from Git history.
4. Gemini provider connectivity, storage recovery, and 1440px/768px/430px browser workflows pass with evidence.
