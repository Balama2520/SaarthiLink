# Saarthi V1 — Pre-Production Checklist (FR-27)

**Order matters.** Do not skip steps. Do not deploy to real users until every
step below has a checkmark (✅) next to it and both the pre-prod engineer and
reviewer have signed off.

Engineer sign-off: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
Reviewer sign-off:  \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Step 1 — Env validate

```bash
# 1a) Copy the example to real env
cp backend/.env.example backend/.env

# 1b) Every required key below must be set (no empty strings)
#   SECRET_KEY                    <- python -c "import secrets;print(secrets.token_urlsafe(64))"
#   ALGORITHM=HS256
#   ACCESS_TOKEN_EXPIRE_MINUTES=1440
#   DATABASE_URL                 <- Supabase Pooler / Transaction Mode (6543) + ?pgbouncer=true
#   GEMINI_API_KEY               <- https://aistudio.google.com/apikey
#   SUPABASE_URL                 <- Supabase Project → Settings → API
#   SUPABASE_SERVICE_ROLE_KEY    <- Supabase Project → Settings → API → service_role
#   STORAGE_BUCKET=resumes
#   REDIS_URL                    <- (optional) Upstash / self-host. Blank = disable cache, OK
#   ALLOWED_ORIGINS              <- comma-sep origins, NO trailing slashes (https://app.saarthi.ai,https://saarthi.app)
#   ADMIN_USERNAMES              <- comma-sep: username(s) that can open /admin
#   DEBUG=false                  <- NEVER DEBUG=true in prod

# 1c) Validate script (runs SECRET_KEY strength check + required fields)
cd backend && python - <<'PY'
from app.core.config import get_settings
s = get_settings()
print(f"[OK] SECRET_KEY length = {len(s.SECRET_KEY)} chars")
print(f"[OK] DEBUG = {s.DEBUG}")
print(f"[OK] GEMINI = {'set' if bool(s.GEMINI_API_KEY) else 'MISSING ⛔'}")
print(f"[OK] SUPABASE_URL = {'set' if bool(s.SUPABASE_URL) else 'MISSING ⛔'}")
print(f"[OK] DATABASE_URL = {s.DATABASE_URL[:25]}***")
print(f"[OK] origins = {len(s._allowed_origins)} origins configured {'✅' if len(s._allowed_origins) > 0 else '⚠️ EMPTY = deny-all (CORS blocked to browser)'}")
PY
```

✅ / ⛔ — Environment validation passes.

---

## Step 2 — Alembic `upgrade head` against real Postgres

```bash
cd backend
# Run ONLY against pooler / session-mode DB
# For Supabase Pooler: ensure DATABASE_URL uses port 6543 + ?pgbouncer=true
alembic upgrade head
# Expected output: INFO  [alembic.runtime.migration] Running upgrade  -> 6297327ece39, ...
# Expected exit: 0
```

✅ / ⛔ — Migrations 001→005 applied cleanly against target Supabase DB.

---

## Step 3 — Backend smoke (same machine that will run prod uvicorn)

```bash
cd backend
# Start the backend in prod mode briefly
DEBUG=false uvicorn app.main:app --host 0.0.0.0 --port 2520 --workers 2

# In a SECOND terminal, hit the 3 probes:
curl -i http://127.0.0.1:2520/api/live    # expect 200 + {"live":true,...}
curl -i http://127.0.0.1:2520/api/ready   # expect 200 + {"ready":true,...}  OR  503 if any required component bad
curl -i http://127.0.0.1:2520/api/health  # expect 200 + all 5 components
# Then shut down the smoke server, proceed to real deploy
```

✅ / ⛔ — `/api/live` 200, `/api/ready` 200, `/api/health` 200 with 5 components.

---

## Step 4 — Frontend build + deploy to Netlify

```bash
cd frontend
# 4a) Set netlify env variable in Netlify UI:
#      VITE_API_BASE_URL  = https://<your-backend-host>
#
# 4b) Build locally to validate:
npm ci
npm run lint   # exit 0
npm run build  # exit 0, produces dist/

# 4c) Deploy via Netlify (either git-connected or CLI):
#     Publish directory = frontend/dist
#     Build command     = npm ci && npm run build
#     IMPORTANT: Add SPA redirect rule in _redirects file OR Netlify UI:
#                /*  /index.html  200
```

✅ / ⛔ — Frontend deployed on Netlify domain.

---

## Step 5 — DNS + SSL (Cloudflare)

```
# Add these 2 CNAME records in Cloudflare DNS. Replace <netlify-site> as shown in your Netlify site → Domain settings.
CNAME    app.saarthi.ai      ->  <netlify-site-id>.netlify.app    (Proxy: ON, orange cloud, Full SSL)
CNAME    api.saarthi.ai      ->  <your-backend-host-domain>       (Proxy: ON, orange cloud, Full SSL)

# Cloudflare SSL/TLS → Overview
#   Encryption mode = Full (strict)
#   Always Use HTTPS = On
#   Minimum TLS Version = TLS 1.2
# Cloudflare Rules → Transform → Response Headers (add HSTS if desired for production):
#   Strict-Transport-Security: max-age=31536000; includeSubDomains  (1 year)

# ⚠️ BACK IN BACKEND ENV UPDATE:
#   ALLOWED_ORIGINS=https://app.saarthi.ai
#   Restart backend process after env change so new CORS whitelist takes effect.
```

✅ / ⛔ — DNS resolves. `curl -I https://app.saarthi.ai` returns 200/30x and `Strict-Transport-Security` header present.

---

## Step 6 — 10-step E2E smoke from real internet (not the server LAN)

Run from your laptop on a non-office network (e.g. home Wi-Fi or phone hotspot).

1. ✅ / ⛔ — Open `https://app.saarthi.ai` → SPA loads, no console errors.
2. ✅ / ⛔ — Register a new user: `/auth` → sign up → redirected to `/dashboard`.
3. ✅ / ⛔ — Profile: Fill 1 field (phone). Save → toast "Saved." appears.
4. ✅ / ⛔ — Goals: Create goal "SWE job by April 2026." Goal appears in list.
5. ✅ / ⛔ — Resume Analyzer: Upload a 1-page PDF/DOCX resume. ATS score shows.
6. ✅ / ⛔ — Career Copilot Chat: send a message → streaming reply comes back.
7. ✅ / ⛔ — Learning Roadmaps: pick ML Engineer → roadmap generated (steps visible).
8. ✅ / ⛔ — Interview Coach: Generate 3 questions → 3 Qs appear.
9. ✅ / ⛔ — Admin panel: ADMIN user logs in → `/admin` 200. Non-admin returns 403.
10. ✅ / ⛔ — Logout, then try refresh token via devtools → 401 (token properly revoked).

---

## Step 7 — Laptop-off smoke (live user traffic rehearsal)

```
Leave the app running, close your laptop, go home.
Come back 8 hours later and re-run only steps 3, 6.3, 6.5, 6.6:

- uvicorn workers still alive
- Postgres pool still alive (SELECT 1 works; pool_pre_ping=True recovers stale conns)
- Resume upload still works (no Supabase token expiry)
- Streaming chat still works (no Gemini quota lock-in or 429 from mis-config)

✅ / ⛔ — Laptop-off smoke passes.
```

---

## Rollback Playbook (in case Step 6 / Step 7 fails)

| Fail Type | Action |
|---|---|
| Backend 5xx rate high | Swap image tag on backend to previous SHA; restart; `alembic downgrade -1` only if the migration is reversible (all 5 are forward-only so do a DB point-in-time restore from Supabase backups). |
| Frontend crash (broken SPA) | Netlify → Deploys → click previous good deploy → `Publish deploy`. Takes ~30s. |
| CORS / DNS misconfig | Fix `ALLOWED_ORIGINS` env var → restart backend pod. Add/remove Cloudflare proxy until straight. |
| Supabase Storage 403 | 1) Verify bucket `resumes` exists and is Private (NOT public). 2) Service role key in env has write access. 3) Confirm backend service role key is SUPABASE_SERVICE_ROLE_KEY, not anon key. |
| AI gateway all 5xx | (a) Change `AI_PRIMARY=ollama` + `OLLAMA_BASE_URL` to self-hosted llama3 as fallback; restart. (b) Then investigate Gemini quota/key rotation. |
