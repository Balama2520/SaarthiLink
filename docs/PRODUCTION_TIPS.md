# Saarthi V1 — Production Operational Tips (FR-33)

Target audience: Founder on-call + DevOps. These are the day-2+ ops tips that
save 2 AM incidents. Every item is actionable — no generic filler.

---

## 1. Monitoring (tip #1)

Deploy **UptimeRobot / BetterStack / Datadog Synthetic** monitors (at minimum):

- `https://api.saarthi.ai/api/live`  → 30s interval (cheap to check, catches crash loop)
- `https://api.saarthi.ai/api/ready` → 60s interval (catches DB/Storage/AI issues)
- `https://app.saarthi.ai/`          → 60s interval, check for 200 + string "Saarthi"
- Alert destination: PagerDuty → your phone number + Telegram founder group.

*Why? `/api/live` and `/api/ready` are **disjoint** probes. You want to know
about a dead process BEFORE users tell you, and know about a dead Postgres
pool BEFORE /live would catch it.*

---

## 2. Backups (tip #2)

- **Supabase auto backups**: On by default for Pro plan. Set *Point-in-time recovery (PITR)* retention = **7 days minimum, 30 days recommended**.
- **Daily bucket snapshot**: Storage → Settings → Enable daily snapshot export to separate S3/GCS account (different from main Supabase project IAM). You want off-provider copies.
- **Every Sunday at 03:00 UTC**: Run `pg_dump` + encrypt + store in cold storage:
  ```bash
  export PGPASSWORD=<pw>
  pg_dump -h <host> -U postgres.<ref> -p 6543 postgres --no-owner \
    | gpg -c --cipher-algo AES256 --passphrase-file ./vault-key.gpg \
    | aws s3 cp - s3://saarthi-backups/pg-dump/$(date +%F).sql.gpg
  ```

---

## 3. SECRET_KEY + service key rotation cadence (tip #3)

Rotate every **90 days**, OR immediately if a key is suspected leaked. Procedure:

1. Generate new SECRET_KEY (step 0.5 of deployment guide).
2. Update env → deploy backend — **existing users get logged out automatically** (safe, expected).
3. For **SUPABASE_SERVICE_ROLE_KEY**: Supabase Project → Settings → API → **Rotate service_role key** → swap env → restart backend. This is zero-downtime for *reads*; uploads may 403 for ~10 seconds while the process restarts.
4. For **GEMINI_API_KEY**: Google AI Studio → Revoke old, create new, swap env.

---

## 4. Cache warm on deploy (tip #4)

After every backend deploy: hit these endpoints ONCE to warm imports + DB pool.
Add as a post-deploy hook:

```bash
curl -s -o /dev/null https://api.saarthi.ai/api/health
curl -s -o /dev/null https://api.saarthi.ai/api/profile -H "Authorization: Bearer <service test token>"
```

First real user request after deploy should be <500ms, not 6s.

---

## 5. AI fallback on provider outage (tip #5)

If Gemini is throwing 5xx or 429:
1. In backend env add: `AI_PRIMARY=ollama`
2. Set `OLLAMA_BASE_URL=http://<ollama-host>:11434` (run llama3 on 8 GB GPU box via Lambda Labs / RunPod spot)
3. Restart backend.

The AI gateway (`ai/gateway.py`) will route all requests to the self-hosted
ollama. Users see **no UI change**, all prompts/JSON output contracts
preserved.

---

## 6. Rate limit tuning when you get real traffic (tip #6)

Default: 120 req/60 s per client IP. After GA:

- **Early burst** (launch day / HN-style): raise to 240/min for 1 hour, watch auth + resume upload endpoints.
- **Chronic abuse (1 IP >500/min)**: Add a Cloudflare WAF rule → challenge JS or block.
- Never set rate limit window under 10 seconds — it causes flaky 429s behind proxies.

---

## 7. CORS origin whitelist operations (tip #7)

- **Only add FINAL PROD domains** (`https://app.saarthi.ai`), never preview deployments. If contractors need preview access, use the Netlify-specific deploy URL as a **temporary** origin and REMOVE it after the demo.
- If you add an origin, remember: backend container must **restart** (it caches the list at process boot).
- **NEVER put `*`** (star) — code protects against it, but don't test that.

---

## 8. User onboarding funnel monitoring (tip #8)

Track these 5 events (PostHog / Mixpanel / custom `INSERT INTO analytics.events`):

| Funnel step | Where to log |
|---|---|
| user.signup | POST /api/auth/register success |
| profile.1fieldSaved | PATCH /api/profile success, any field |
| goal.created | POST /api/goals success |
| resume.uploaded | POST /api/resume/upload 201 |
| copilot.first_chat | POST /api/sessions/{id}/stream first chunk returned |

Any drop >25% between steps = investigate. E.g. if 40% signups never save 1 profile field → add an in-app prompt.

---

## 9. Postgres DB VACUUM weekly (tip #9)

On Supabase you can't run VACUUM FULL, but you CAN schedule a weekly task via
pg_cron to keep indexes compact.

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('weekly-vacuum-analyze', '0 4 * * 0', 'VACUUM ANALYZE');
```

This runs Sunday 04:00 UTC. Keeps planner estimates fresh so `session_messages`
and `goals` queries stay fast after 10k+ active users.

---

## 10. Structured log drain to Loki / Better Stack (tip #10)

All backend logs already:
- Carry a `request_id` in every line
- Use JSON format (set `JSON_LOGS=true`)

Point log drain to a retention bucket. Alert threshold: **any 5xx error count > 5/minute**.
When debugging, a user sending you a screenshot of an error → ask for the page
URL + approximate timestamp, grep for `request_id` in that minute window, see
full server-side exception in the same trace.

---

## 11. Supabase Storage lifecycle rules (tip #11)

Storage → `resumes` bucket → Lifecycle:
- Keep 90 days, then move to Infrequent Access.
- Keep 365 days, then DELETE (respects GDPR-style data minimization).
- For users who **Delete Account**: wire up a Supabase Edge Function that runs 7 days
  after `users.deleted_at` is set → purge user's bucket keys.

---

## 12. Frontend cache busting on release (tip #12)

Vite already hashes every JS/CSS asset. For the remaining `index.html` add these
Netlify response header rules (or Cloudflare rule) to avoid returning stale
`index.html`:

```
/index.html   Cache-Control: no-cache, no-store, must-revalidate
/assets/*     Cache-Control: public, max-age=31536000, immutable
```

Eliminates "I refreshed but still see old UI" tickets.

---

## 13. Admin access zero-trust (tip #13)

- **Never** put admin-only functions behind `/api`. Keep `/api/admin/*` username allow-listed (done) + **add IP allowlist via Cloudflare WAF rule**: only allow traffic from your office/home known-good IPs to hit `/api/admin/*` and `/admin`.
- Rotate admin usernames list: when a contractor loses access, remove username from env + restart.

---

## 14. Redis unavailable handling review (tip #14)

If Redis is blank / unreachable, the backend gracefully degrades. Symptoms of Redis being missing you *will* see:
- `/api/health` → components.redis.status = "degraded"
- Career summary cache miss ratio ~100% → slower dashboard loads
- No memory recall in copilot chats (context window only = current session)

Do NOT panic. Just fix `REDIS_URL` and restart backend. No user data is lost
(redis only stores cache, not ground truth — ground truth is in Postgres).

---

## 15. Deploy window etiquette (tip #15)

- Deploy backend **Tue–Thu, 10:00–14:00 local time with two people online** (founder + dev). Never deploy Friday evening or before vacation.
- Frontend (Netlify) *can* deploy anytime — rollback = 1 click.
- After deploy: run the 10-step E2E checklist before declaring done.
