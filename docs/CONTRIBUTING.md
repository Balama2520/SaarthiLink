# Contributing to Saarthi AI

Thanks for considering a contribution to Saarthi. This document describes how
the project is structured, how to get a local environment running, and what
is expected of a change before it's merged.

Saarthi is currently maintained by a single founding engineer. Contributions
are welcome, but please open an issue or reach out before starting large or
architectural changes so effort isn't wasted on something that won't fit the
project's direction.

---

## Before you start

- **Production branch:** `master`. All work should branch from `master` and
  target `master` in pull requests.
- **Read first:** [`README.md`](../README.md) for the product and
  architecture overview, and [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) for
  system boundaries.
- **No secrets, ever.** Never commit `.env` files, API keys, JWT secrets,
  service-role keys, resumes, user documents, database exports, Chroma data,
  or logs. If a credential ever ends up in a commit, terminal transcript,
  screenshot, or issue, treat it as compromised and rotate it.
- **License:** the project is MIT licensed (see [`LICENSE`](../LICENSE)).
  Contributions are accepted under the same license.

---

## Local environment

### Prerequisites

- Git
- Python 3.11 (matches the production Docker image — use the same major/minor
  version locally so backend behavior, especially around ChromaDB, matches
  production)
- Node.js 18 or newer
- PostgreSQL for production-like local work, or SQLite for lightweight
  development
- Optional: Ollama, if you want to exercise the local AI fallback

### Clone and configure

```bash
git clone https://github.com/Balama2520/SaarthiLink.git
cd SaarthiLink
```

Create local environment files from the templates. **Never commit `.env`
files.**

```powershell
copy .env.example .env                 # Windows
copy backend\.env.example backend\.env
```

For a minimal setup: set a strong `SECRET_KEY`, an explicit local
`ALLOWED_ORIGINS`, and a local SQLite `DATABASE_URL`. Only configure
`GEMINI_API_KEY`, `HF_SPACE_ID`/`HF_API_TOKEN`, or `OLLAMA_URL` for the AI
provider you actually intend to exercise — you don't need all three.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 2520 --reload
```

On macOS/Linux, activate with `source .venv/bin/activate`.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Runs at `http://localhost:5173` by default.

### Full local stack

```bash
docker compose up --build
```

This starts the backend, frontend, PostgreSQL, and Redis together. Do not
reuse the sample database password or any development secret in a public or
production environment.

---

## Making a change

1. **Create a focused branch from `master`.** One logical change per branch
   and pull request — avoid bundling unrelated fixes or refactors together.
2. **Make the smallest coherent change** that solves the problem. Prefer
   several small, reviewable pull requests over one large one.
3. **Add or update tests** for any behavior change. New backend logic should
   have corresponding tests under `backend/tests/`.
4. **Follow existing boundaries.** In particular:
   - Business logic and authorization decisions belong in the backend, never
     the frontend.
   - Persistence goes through `backend/app/repositories/`, not ad hoc queries
     scattered through services or routers.
   - Schema changes go through an Alembic migration in
     `backend/alembic/versions/` — never hand-edit the production schema.
   - AI provider calls go through `backend/app/ai/gateway.py` / `router.py`
     so timeouts, fallback ordering, and metrics stay consistent.
5. **Scope every user-owned query by the authenticated user ID.** This is a
   hard rule, not a style preference — it's the difference between a normal
   bug and a data-leak vulnerability.
6. **Keep AI behavior bounded.** Any new AI-backed feature needs a timeout, a
   graceful failure path, and should not assume a specific provider is always
   available.

---

## Verifying your change before opening a PR

Run what you touched, at minimum:

**Frontend**

```bash
cd frontend
npm run build
npm run lint
```

**Backend** (from a Python 3.11 environment)

```bash
cd backend
pytest -q
```

Notes on backend tests:

- The Hugging Face provider is covered by deterministic mocked tests and
  should never require a live HF token to pass locally or in CI.
- Live provider smoke tests (real calls to Gemini/HF/Ollama) belong in an
  explicitly marked smoke-test workflow, not the default regression suite —
  don't add live network calls to `pytest -q`.

> **Heads up:** the repository's GitHub Actions workflows
> (`.github/workflows/ci.yml`, `.github/workflows/ci-cd.yml`) currently
> trigger on the `main`/`develop` branches, not `master`. Since `master` is
> the actual production branch, CI does not automatically run on it yet.
> Until that's fixed, treat the commands above as the source of truth for
> verification, and run them yourself before opening a pull request.

---

## Commit and pull request format

- Write commit messages that describe **why**, not just what — "fix" or
  "update" alone isn't enough context for a reviewer six months from now.
- In the pull request description, include:
  - **Problem** — what was broken or missing.
  - **Solution** — what you changed and why you chose that approach.
  - **Risks** — anything that could break, especially around auth, data
    scoping, migrations, or AI provider behavior.
  - **Verification** — the commands you ran and their results.
- Confirm no secrets or runtime data (resumes, `.env` files, database dumps)
  are staged before pushing.
- Do not force-push `master`. Every production change should be traceable to
  a reviewed commit with a clear rollback path.

---

## Reporting bugs or proposing features

Open a GitHub issue with:

- What you expected to happen vs. what actually happened.
- Steps to reproduce, if it's a bug.
- Which part of the system it touches (frontend, backend, AI gateway, job
  ingestion, etc.), if you know.

For anything involving hiring, partnerships, or collaboration outside of code
contributions, see the README's [Partnerships & Collaboration](../README.md#-partnerships--collaboration)
section or email `saarthi.ai.team@gmail.com` directly.
