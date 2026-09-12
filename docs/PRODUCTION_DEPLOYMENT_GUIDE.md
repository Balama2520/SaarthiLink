# Saarthi V1 — Production Deployment Guide (FR-32)

Four targets covered:
- [1 Supabase (Postgres + Storage Bucket)](#1-supabase-postgres--storage-bucket)
- [2 Backend host (Docker, env block, uvicorn workers)](#2-backend-host-docker-deploy)
- [3 Frontend (Netlify build + VITE_API_BASE_URL)](#3-frontend-netlify)
- [4 Cloudflare DNS + SSL + CORS origin update](#4-cloudflare-dns--ssl)

Operator assumption: you own 4 credentials already. If not — stop at §0.

---

## § 0 — External credentials required from operator

| # | Value | Where to get | Example |
|---|---|---|---|
| 1 | **SUPABASE_URL** | Supabase → Project → Settings → API | `https://xxxx.supabase.co` |
| 2 | **SUPABASE_SERVICE_ROLE_KEY** | Supabase → Project → Settings → API → service_role | `eyJhbGciOi...` |
| 3 | **DATABASE_URL (Pooler Session Mode)** | Supabase → Project → Settings → Database → Connection string → Pooler → Session mode. Append `?pgbouncer=true`. | `postgresql://postgres.xxx:xxxxx@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| 4 | **GEMINI_API_KEY** | Google AI Studio → API Keys | `AIzaS...` |
| 5 | **SECRET_KEY** | `python -c "import secrets;print(secrets.token_urlsafe(64))"` | (random, ≥64 url-safe chars) |
| 6 | **ADMIN_USERNAMES** | Comma separated list of exact usernames who get /admin access | `saarthifounder,devopslead` |
| 7 | **REDIS_URL (optional)** | Upstash → REST token URL OR `redis://user:pw@host:port` | blank = cache disabled |
| 8 | **ALLOWED_ORIGINS** | Final user-facing domains (comma-sep, NO trailing slashes). | `https://app.saarthi.ai,https://saarthi.app` |
| 9 | **Apex domain** (app. + api.) | DNS provider (Cloudflare) | `saarthi.ai` |

> Do not invent values. If any of 1–4 are missing, procurement is the
> blocking step — nothing below is deployable. This document does not tell
> the operator how to *sign up* for these providers; only how to wire the
> already-issued values into Saarthi.

---

## 1 Supabase (Postgres + Storage Bucket)

```
  Dashboard → Create new project → region = nearest user cohort.
  Postgres password: store separately in password manager.
  Wait for DB provisioning (~2 minutes).
```

**1a Storage bucket**
1. Project → **Storage** → *New bucket*
2. Name: `resumes`
3. Toggle **"Make the bucket public"** → OFF (private ACL)
4. Save. Bucket exists.

No additional RLS policy required for uploads because the backend uses the
**service_role** key, which bypasses RLS. **NEVER expose service_role key
to the browser / frontend env.** Backend-only.

**1b Alembic migrations against Supabase pooler**
```bash
# Machine: local laptop OR CI runner. Use pooler URL for all ops.
export DATABASE_URL="postgresql://postgres.xxx:xxxxx@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export SECRET_KEY="... step 0.5 ..."
export DEBUG=false

cd backend
# Apply 001→005
alembic upgrade head
# Expected exit 0.
# Confirm 5 migrations ran:
alembic current
# -> head = 6297327ece39
```

---

## 2 Backend host (Docker deploy)

**2a Build image**
```bash
cd backend
# Any Dockerfile-compatible host. Example Docker repo tag on GAR/Docker Hub/ECR:
export IMAGE=docker.io/saarthi/backend:$(git rev-parse --short HEAD)
docker build -t $IMAGE .
# Push to registry
docker push $IMAGE
```

**2b Run container with env block**

Save as `backend-prod.env` (chmod 600, never commit):

```env
SECRET_KEY=<step 0.5>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=<step 0.3 pooler URL>
GEMINI_API_KEY=<step 0.4>
SUPABASE_URL=<step 0.1>
SUPABASE_SERVICE_ROLE_KEY=<step 0.2>
STORAGE_BUCKET=resumes
REDIS_URL=<step 0.7 or leave blank>
ALLOWED_ORIGINS=<step 0.8>
ADMIN_USERNAMES=<step 0.6>
DEBUG=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=120
RATE_LIMIT_WINDOW_SECONDS=60
VERSION=1.0.0
API_PREFIX=/api
```

Start command on server (example docker run; replace with ECS/fly.io/k8s as needed):

```bash
# Minimum 2 workers for small-launch resilience
docker run -d \
  --name saarthi-backend \
  --restart unless-stopped \
  --env-file /opt/saarthi/backend-prod.env \
  -p 2520:2520 \
  $IMAGE
```

Verify:
```bash
curl -s http://127.0.0.1:2520/api/live  # {"live":true}
curl -s http://127.0.0.1:2520/api/ready | head -c 200
```

---

## 3 Frontend (Netlify)

**3a Build config**

Netlify site:
- Build command: `cd frontend && npm ci && npm run build`
- Publish directory: `frontend/dist`

Add SPA redirect rule — either of the two methods:

**Option A (preferred) — `frontend/public/_redirects`:**
```
/*    /index.html   200
```

**Option B — Netlify UI Site settings → Redirects:**
```
Origin: /*   Target: /index.html   Status: 200 Rewrite
```

**3b Environment variable in Netlify UI** (NOT a Vite-prefixed secret except this one public API origin):
```
VITE_API_BASE_URL=https://api.saarthi.ai
```

**3c Deploy**
Either:
- Git-connected push to `main` triggers build automatically; OR
- CLI: `npm i -g netlify-cli && netlify deploy --prod --dir=frontend/dist`

Smoke test deployed URL: open the site → Auth page renders, no 404 sub-route reload on refresh.

---

## 4 Cloudflare DNS + SSL

Zone = your apex domain (`saarthi.ai`).

**4a Two CNAMEs**

| Type | Name | Target | Proxy status | TTL |
|---|---|---|---|---|
| CNAME | `app` | `<netlify-site-id>.netlify.app` (from Netlify → Site settings → Domains) | Proxied (orange) | Auto |
| CNAME | `api` | Hostname of backend host (e.g. droplet IP A record, or ELB/ALB domain) | Proxied (orange) | Auto |

**4b SSL/TLS**
- SSL/TLS → Overview: **Full (strict)**
- Edge Certificates → **Always Use HTTPS: On**
- Minimum TLS Version: **TLS 1.2**
- HSTS (optional but recommended; enable AFTER you confirm HTTPS works for 7 days):
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  (Response headers rule in Rules → Transform Rules)

**4c Backend CORS whitelist update**

The CNAME `app.saarthi.ai` is the prod origin. **Set it NOW**:

```env
ALLOWED_ORIGINS=https://app.saarthi.ai
```

Restart backend container → `docker restart saarthi-backend`.

**Confirm CORS live**
Open browser dev console on `https://app.saarthi.ai`:
```js
await fetch("https://api.saarthi.ai/api/live").then(r=>r.text())
```
→ No CORS error in console, body contains `"live":true`.

---

## Rollback playbook summary

| Component | Rollback action (in order) |
|---|---|
| Backend | 1) Deploy previous Docker SHA (workers restart). 2) If DB schema incompatible, Supabase → Backups → Point-in-time restore to before migrations. |
| Frontend | Netlify → Deploys → click previous green deploy → Publish deploy → ~30s生效 |
| DNS | Flip cloud orange → gray to bypass Cloudflare, check backend directly, then re-enable. |
| AI failures | Temporarily swap primary provider `AI_PRIMARY=ollama` and point OLLAMA_BASE_URL at local llama3 until Gemini quota recovers. |
| Storage 403 | Verify bucket name matches env `STORAGE_BUCKET=resumes`; confirm using SERVICE_ROLE key not anon; confirm NOT public bucket. |
| Auth broken | Rotate SECRET_KEY (all users get logged out, safe); rerun step 0.5 with fresh token ≥64 chars. |
