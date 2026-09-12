# Saarthi V1 — Supabase-Specific Setup Guide (FR-34)

Four sub-steps, fully covered:
- [a) Bucket creation: `resumes` + private ACL](#a-bucket-creation-resumes--private-acl)
- [b) Alembic migration run against Supabase Pooler](#b-alembic-migration-run-against-supabase-pooler)
- [c) Connection string with `?pgbouncer=true`, port 6543, psycopg driver](#c-connection-string-best-practice)
- [d) Bucket read proxy via backend: why we NEVER expose service_role to browser](#d-reads-via-backend-proxy-or-signed-urls)

---

## a) Bucket creation: `resumes` + private ACL

**Step by step in Supabase dashboard:**

1. Open **your project** → sidebar → **Storage**.
2. Top-right → **New bucket**.
3. **Name**: `resumes` (exact lowercase, no dashes, no spaces).
4. **Make the bucket public**: ⚙️ **DISABLED / OFF** (keep it unchecked).
5. Click **Create bucket**.

*What private means in Supabase Storage:*
- Unauthenticated HTTP GET to `/storage/v1/object/public/resumes/...` returns 403.
- **Anon key** can ONLY read if a Row-Level Security policy says yes.
- **Service_role key** bypasses RLS and can read/write anything — backend only.

*Verification:*
```
Supabase → Storage → resumes →  Permissions should say:
  "This bucket is private — only policies and service_role can access it."
```

### Optional: Bucket size cap

Storage → Policies → New policy on `storage.objects` schema:

```sql
CREATE POLICY "resumes_bucket_size_cap_enforced_via_trigger_is_outside_scope"
ON storage.objects FOR ALL
USING (bucket_id = 'resumes')
WITH CHECK (
  bucket_id = 'resumes'
  AND LENGTH(name) < 512
);
```

*Note: actual per-file size cap of 5 MB is enforced IN THE BACKEND (resume API), not as a DB policy.*

---

## b) Alembic migration run against Supabase Pooler

The Supabase **Direct Connection (5432)** is for manual psql sessions only.
**For the backend AND alembic, use the POOLER, port 6543, Session mode.**

**Get the pooler URL:**
1. Supabase → Project → Settings → **Database**
2. Scroll to **Connection string** → **Pooler** tab
3. Mode dropdown → **Session** (SAARTHI ONLY supports Session mode with pgbouncer — Transaction mode breaks `CREATE EXTENSION` / SET statements sometimes used in migrations)
4. Password: click the eye to reveal. Copy the URL. It will look like:
   ```
   postgresql://postgres.pjtZzzXxxxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. **Append `?pgbouncer=true`** at the end:
   ```
   postgresql://postgres.pjtZzzXxxxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

**Run migrations from CI runner or laptop that has the env set:**
```bash
# Minimal required env (do not set anything else):
export DATABASE_URL="<above url with ?pgbouncer=true>"
export SECRET_KEY="does-not-matter-for-alembic-but-validator-requires-length"
export DEBUG=false

cd Saarthi/backend
alembic upgrade head

# Expected output:
# INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
# INFO  [alembic.runtime.migration] Will assume transactional DDL.
# INFO  [alembic.runtime.migration] Running upgrade  -> 558e39301e77, initial ai os schema
# INFO  [alembic.runtime.migration] Running upgrade 558e39301e77 -> 06e519b97e2b, add_job_ecosystem_phase1
# INFO  [alembic.runtime.migration] Running upgrade 06e519b97e2b -> 124d080d546c, extend_user_profile
# INFO  [alembic.runtime.migration] Running upgrade 124d080d546c -> b9f484181401, add_resume_versioning_and_status_batch
# INFO  [alembic.runtime.migration] Running upgrade b9f484181401 -> 6297327ece39, add_ondelete_cascade_and_refreshtoken

# Confirm
alembic current
# -> 6297327ece39 (head)
```

*If any migration step fails at 558e39301e77 with "relation already exists", it
means a previous deploy or `python migrate_db.py` already created tables via
Base.metadata.create_all(). SAFE FIX: stamp baseline, then re-run:*
```bash
alembic stamp 558e39301e77
alembic upgrade head
```

---

## c) Connection string with `?pgbouncer=true`, port 6543, psycopg driver

### Why this exact recipe works:

| Field | Value | Reason |
|---|---|---|
| Host | `*-pooler.supabase.com` | HA pooler handles transient restarts |
| Port | **6543** | Pooler port, NOT 5432 |
| Driver | `postgresql://` → picked up by psycopg2-binary via SQLAlchemy | Supabase official driver, handles SSL root cert fallback |
| Query param | **`?pgbouncer=true`** | Tells psycopg to skip features incompatible with pgbouncer session pooling (fewer server round-trips, more resilient connections) |
| SSL | Inherited from Supabase global root cert path | No need for `?sslmode=require` because Supabase enforces it on the server side for pooler; but psycopg tries SSL first. |

### Backend runtime `DATABASE_URL` (production container env)

Set exactly this pattern:

```
DATABASE_URL=postgresql://postgres.<project-ref>:<pooler-password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Engine pooling we already configured on Saarthi side:

In `database/connection.py`:
```python
pool_size = 20
max_overflow = 10          # Peak capacity 30 conns
pool_timeout = 30
pool_recycle = 1800        # Recycle after 30 min
pool_pre_ping = True       # Revive dead conns transparently (NEW IN 1.0 HARDENING)
```

This matches pgbouncer defaults (default_pool_size=20) perfectly — backend asks for
20 + overflow 10, pgbouncer gives 20, overflow gets queued <30s then errors.
Healthy.

---

## d) Reads via backend proxy or signed URLs: NEVER expose service_role to browser

**Design rule (non-negotiable):**
> The `SUPABASE_SERVICE_ROLE_KEY` is NEVER emitted into frontend env. The only
> way a browser gets a resume file back is either:
>
> 1. Backend proxies the bytes (`GET /api/resume/{id}/file`) — RECOMMENDED,
>    because we re-auth the JWT, re-check user owns row, return bytes inline.
> 2. Backend creates a short-lived signed URL via Supabase Storage API, returns
>    it to the browser (valid ~60s). Good for >50 MB (Saarthi does not need this
>    today because resume cap is 5 MB).

### Verify backend proxy flow is used (already implemented in storage_service.py):

In `storage_service.py::SupabaseStorageService`:

```python
def upload_resume(self, filename: str, content_bytes: bytes, content_type: str, user_id: str)
    # Uses: `self.supabase.storage.from_(self.bucket).upload(...)`
    # Returns: `StoredObjectReference(provider="supabase", bucket, key, reference)`

def download(self, reference: str) -> bytes:
    # Parses supabase://bucket/key → calls .from_(bucket).download(key)
    # Returns raw bytes. Backend then wraps in StreamingResponse OR base64 to frontend.
    # Browser never sees the service_role key, never sees the supabase internal URL.
```

### Browser side check — run this from your prod site's DevTools console after deploy:

```js
// Look for any network call to *.supabase.co/storage/v1/object/... from the SPA.
// Expected result: NONE. All resume bytes via /api/resume/<id>/download backend route.
```

*If you see a direct call to Supabase Storage from SPA → you have a frontend bug
(leaked anon key usage, or wrong storage client init). Fix before opening to users.*

### Signed URL fallback (for future very large files >50 MB):

```python
# In storage_service.py — add later, not today
def create_signed_url(self, reference: str, expires_in: int = 60) -> str:
    bucket, key = self._parse_ref(reference)
    return (self.supabase.storage
            .from_(bucket)
            .create_signed_url(key, expires_in)
            .get("signedURL"))
```

*Purpose: browser does one GET to the signed URL, data flows direct from Supabase
edge without streaming through backend. Use when uploads >50MB. Saarthi V1's cap
= 5 MB, so we use the proxy approach (simpler, more secure).*

---

## Checklist of 4 sub-steps (FR-34 TR)

| Item | Complete? |
|---|---|
| (a) Created bucket `resumes`, Private ACL (NOT public), name lowercase exactly | ✅ / ⛔ |
| (b) `alembic upgrade head` ran against Pooler session mode, exit 0, head=6297327ece39 | ✅ / ⛔ |
| (c) `DATABASE_URL` in backend env uses port 6543, pooler host, `?pgbouncer=true`, psycopg driver scheme `postgresql://` | ✅ / ⛔ |
| (d) Reads go through backend proxy /service role stays server-side; grep frontend dist for service_role returns 0 matches | ✅ / ⛔ |
