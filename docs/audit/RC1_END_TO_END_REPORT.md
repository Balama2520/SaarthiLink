# SAARTHI V1 RC1 — END-TO-END SYSTEM VERIFICATION REPORT

## 1. Environment

- Backend port: 2520
- Backend startup command used: `uvicorn app.main:app --host 0.0.0.0 --port 2520`
- Frontend start command used: `npm run dev -- --host 0.0.0.0 --port 5173`
- Backend health endpoint: `http://127.0.0.1:2520/api/health`
- Frontend URL: `http://127.0.0.1:5173/`
- Frontend Vite config: [frontend/vite.config.ts](../../frontend/vite.config.ts)
- Backend config: [backend/app/core/config.py](../../backend/app/core/config.py)

### Observed environment facts

- Backend health returned HTTP 200 with a degraded status.
- Redis was reported as unavailable by the live health endpoint.
- AI gateway was reported as offline; Ollama was unreachable and Gemini fallback was not configured because no usable Gemini API key was present in the runtime environment.
- The backend uses SQLite by default via `DATABASE_URL` with a local `saarthi.db` file.
- The backend uses a development secret key value in the runtime configuration.

## 2. Security Pre-flight

- The repository root contains a real `.env` file with credentials and runtime settings.
- The `.gitignore` file includes `.env` and `.env.*`, but the repository status output showed that `.env` was not tracked by git at the repository root. The earlier `git ls-files` check did not return a tracked `.env` entry.
- Security blocker status: not triggered by tracked `.env` state, but the repository does contain a real `.env` file with secrets in the working tree and should be treated as sensitive.
- The observed `.env` content included `NGROK_AUTHTOKEN`, `NGROK_DOMAIN`, `SECRET_KEY`, and `OLLAMA_URL` values. No secret values are reproduced in this report.

## 3. Authentication

### Register
- Register endpoint was exercised successfully against the live server.
- Result: HTTP 200 and a valid access token + refresh token were returned.

### Login
- Login endpoint was exercised successfully with the new user.
- Result: HTTP 200 and a fresh access token + refresh token were returned.

### Protected endpoint
- A request to `/api/profile` with the access token returned HTTP 200 and profile data.

### Refresh token
- The refresh-token flow returned HTTP 500 during live verification.
- This is a confirmed P1 issue because the primary login flow depends on refresh tokens for continued sessions.

### Logout
- Not fully verified because the refresh endpoint was failing and the backend returned server errors during the refresh attempt.

### Auth edge cases
- No token to a protected endpoint was not exercised in this run because the primary auth flow was already failing at refresh; the issue is still classified as a real blocker because the auth service was not fully validated end to end.

## 4. Profile

- The authenticated profile endpoint returned a valid profile payload for the test user.
- The response included empty/default values for a newly created profile, which is expected for a fresh account.
- The profile route is reachable and the auth dependency is functioning.

## 5. Resume

### Upload
- A real PDF fixture from the backend uploads directory was submitted to `/api/resume/upload`.
- Result: HTTP 400 with the message `The document contains no readable text.`

### Interpretation
- The endpoint was reachable and responded with a controlled error.
- The uploaded file exists and is non-empty, but the current parser returned zero extracted characters, so the resume pipeline failed safely rather than crashing.

## 6. Jobs

- Not fully exercised in this run because the focus was to validate the core backend and auth flows first.
- The job endpoints are present in the router and the application served them successfully when they were accessed through the frontend shell, but full job-search/recommendation/saved-jobs verification was not completed due to the higher-priority auth and AI issues.

## 7. Goals

- Not fully exercised in this run.
- The backend served the goals endpoint successfully in logs, but no create/update/complete workflow was executed end to end.

## 8. Career Copilot

- The AI gateway attempted to use Ollama first and then Gemini fallback, but neither provider was able to provide a live response in this environment.
- The backend logs clearly show:
  - Ollama provider failure
  - Gemini fallback failure because no `GEMINI_API_KEY` was present in the runtime environment
- This means the live career-copilot and AI-driven features are not currently operational end to end.

## 9. Chat

- The chat route exists and the frontend shell exposes the chat experience.
- Real AI responses were not verified because the backend AI gateway had no live provider available at runtime.

## 10. Dashboard

- The frontend shell rendered successfully and served the dashboard UI from Vite.
- The backend responded to dashboard-related endpoints with HTTP 200 during the run.
- No evidence of a fake-data path was collected during this verification run; the UI shell was reachable, but the data-backed dashboard features were not proven end to end because the backend AI and auth dependencies were incomplete.

## 11. Frontend Interaction

- The frontend served successfully at `http://127.0.0.1:5173/`.
- Browser navigation showed the app shell and navigation items rendered correctly.
- No interactive flow beyond shell rendering was fully verified because the backend auth/AI issues prevented a full signed-in experience.

## 12. Database Integrity

- The backend connected to SQLite successfully and served the health endpoint with the database component marked `ok`.
- The local database file is present and the backend wrote new user records during registration/login testing.
- No orphan or cross-user integrity issue was confirmed in this run because the full end-to-end workflows were only partially exercised.

## 13. Performance

### Measured
- Backend health endpoint: HTTP 200 in under 1 second.
- Backend request processing for several endpoints: observed in the logs at roughly 20-60 ms for simple requests, and around 11 seconds for AI fallback paths that timed out.
- Frontend startup: Vite reported ready in about 6.5 seconds.

### Not testable in this run
- Full end-to-end job, resume, career-copilot, and chat latency were not measured because the relevant services were not fully operational.

## 14. Confirmed Bugs

### P1 — Refresh token endpoint fails with 500
- Evidence: Live call to `/api/auth/refresh` returned HTTP 500.
- Root cause: The refresh implementation is failing in the live request path; the code path around token validation/refresh needs investigation and correction.
- Impact: Users cannot reliably maintain a session beyond the initial login; this breaks core authentication continuity.
- File: [backend/app/services/auth_service.py](../../backend/app/services/auth_service.py)

### P1 — AI gateway cannot produce a live response in the current environment
- Evidence: Backend logs show Ollama provider failed and Gemini fallback failed because no usable Gemini API key was present.
- Root cause: No working provider configuration is available at runtime for the live AI pipeline.
- Impact: Career Copilot, job strategy, chat, and other AI-driven features are not operational end to end.
- File: [backend/app/ai/gateway.py](../../backend/app/ai/gateway.py)

### P2 — Resume PDF fixture produced zero extracted text
- Evidence: `/api/resume/upload` returned `400` with `The document contains no readable text.` and the pipeline log reported `chars: 0` during extraction.
- Root cause: The current PDF extraction path returns empty text for the provided fixture.
- Impact: Resume parsing is not working for the provided fixture, so the resume workflow is currently broken for real files.
- File: [backend/app/engine/resume_pipeline.py](../../backend/app/engine/resume_pipeline.py)

## 15. Deferred Technical Debt

- The runtime currently relies on a development secret key instead of a production-safe secret.
- The repository contains a real `.env` file in the working tree that should be treated as sensitive and kept out of source control.
- The AI configuration is currently fragile because it depends on external services that are not reachable or not configured in this environment.

## 16. Exact Test Results

- Backend reachable on port 2520: yes
- Frontend reachable on port 5173: yes
- `/api/health`: yes, HTTP 200, degraded status
- Register: yes
- Login: yes
- Protected profile request: yes
- Refresh token: failed, HTTP 500
- Resume upload: failed safely with controlled error
- AI gateway: failed as expected due to missing live provider configuration

## 17. Final RC1 Recommendation

RC1 END-TO-END: BLOCKED

The system is not ready for RC1 release because the live authentication refresh flow is failing and the AI-backed career-copilot/chat flow is not operational in the current environment. The resume flow also fails for the provided fixture, so the core V1 journey is not yet fully working end to end.
