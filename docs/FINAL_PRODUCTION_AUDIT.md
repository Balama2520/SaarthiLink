# Saarthi AI — CTO Project Assessment

**Assessment date:** October 24, 2026
**Assessment type:** Repository review and local verification
**Decision:** **Do not treat the current checkout as production-certified.** Continue development, but close the account-provisioning and data-durability gaps below before inviting real users.

> This report describes the code and tests available in this repository at the assessment date. It is not a penetration test, cloud configuration review, or live production sign-in. No production credentials or real user accounts were used.

## 1. In plain language

Saarthi is a career-support application for students and job seekers. It has a React/TypeScript web app, a FastAPI/Python backend, a relational database, and integrations for AI, job data, and file storage. The product direction is coherent: help a person understand their current profile, prepare for a target role, find opportunities, and work toward a career plan.

The codebase is more than a mock-up: the backend test suite passes, and the frontend compiles and passes lint. That is meaningful progress. It does **not**, by itself, prove that a production deployment is configured correctly, that the AI provider is available, that uploaded files will be retained, or that a real person can complete every journey in a browser.

### Overall scorecard

| Area | Assessment | What that means |
|---|---|---|
| Product direction | **Promising** | The candidate career journey is understandable and valuable. |
| Backend structure | **Good foundation** | Features are separated into API, service, repository, model, and provider layers. |
| Automated backend checks | **Verified locally** | 199 backend tests passed in this assessment. |
| Frontend build and lint | **Verified locally** | TypeScript/Vite build and ESLint passed. |
| New account creation and login | **Verified locally, isolated DB** | Registration and login work in tests; the auth response does not include the database user ID. |
| Admin / CEO access | **Needs a fix before production** | Admin status is inferred from a public username, and username matching is more permissive than database uniqueness. |
| Resume-file retention | **Depends on deployment configuration** | The service explicitly allows a resume record to succeed without durable file storage. |
| Live AI | **Tested; failed to provide an answer** | A real Copilot request returned the temporary-unavailable fallback despite the status panel showing Gemini `OK`. |
| Browser end-to-end journey | **Partially tested** | Live signup, authenticated reads, refresh, and logout were checked; a complete resume-to-career workflow was not. |
| Direct page/API routes | **Deployment issue observed** | The app root loads, but direct page paths and the Netlify `/api/health` path return 404. |

## 2. What was actually checked

These are the checks run for this assessment—not historical claims copied from an earlier report:

| Check | Result |
|---|---|
| Backend auth, profile, and security tests | **23 passed** |
| Full backend pytest suite | **199 passed**, with 3 deprecation warnings |
| Frontend production build and TypeScript check | **Passed** |
| Frontend ESLint | **Passed** |
| Fresh user registration/login against an isolated in-memory database | **Passed** |
| Deployed signup and authenticated profile/dashboard/job reads | **Passed** |
| Deployed refresh-token endpoint | **Passed** (`200`, access token issued, `user` role) |
| Deployed normal-user access to admin stats | **Correctly denied** (`403`) |
| Deployed logout | **Passed** (browser access and refresh tokens cleared) |
| Deployed live Career Copilot request | **Failed** (HTTP `200`, but response was `AI is temporarily unavailable. Please try again.`) |
| Deployed health endpoint | **API and database `ok`; Redis `unavailable`; AI reports `ok`** |
| Direct Netlify page/API routes | **Failed** (404 for `/career-copilot`, `/admin`, and `/api/health`) |
| Google Sheets and Supabase storage | **Not verified live** |

Backend tests use a temporary in-memory database and mock AI calls by default; see [`backend/tests/conftest.py`](../backend/tests/conftest.py). This makes tests repeatable, but means the test results are not a substitute for checking real provider configuration.

For the live check, a disposable account was registered at the user’s request. The app automatically authenticated that account after registration; I verified its authenticated API access, token refresh, and logout. I did **not** separately submit the login form with the account’s credentials, and did not complete a full candidate journey with a resume.

## 3. How a new user and an admin account currently work

### Standard new user

1. A person chooses **Create a new account** in the frontend.
2. The frontend sends a username and password to `POST /api/auth/register`.
3. The backend checks whether the username already exists, hashes the password, creates a user row, and returns access and refresh tokens.
4. The frontend stores those tokens in browser storage and uses the access token for authenticated requests.
5. Login looks up the username, checks the password hash, and issues tokens.

The user record has an integer database `id`, but the registration and login token response does not return that ID. There is no CEO-specific role in the reviewed auth schema: the privileged role is **admin**. See [`backend/app/auth/auth.py`](../backend/app/auth/auth.py), [`backend/app/services/auth_service.py`](../backend/app/services/auth_service.py), and [`backend/app/schemas/auth.py`](../backend/app/schemas/auth.py).

### Admin / “CEO” account

The backend currently decides whether someone is an admin by comparing their username to the comma-separated `ADMIN_USERNAMES` deployment setting. It is not a separate CEO account system.

I tested a new account in a disposable, in-memory database with `ADMIN_USERNAMES=ceo`:

- Registering username `CEO` created a database user with ID `1` in that temporary database.
- Registration and login both returned role `admin`.
- The auth response did **not** include the user ID.
- The temporary database and test password were not retained.

I also registered one disposable **non-admin** verification account on the deployed site, then signed it out after testing. Its profile response identified the account as database user ID `7`; the auth token response itself did not include that ID. The account remains in the deployed database because the test did not include an account-deletion operation. Its generated password was not saved in this report.

**Why this needs attention:** the database’s username uniqueness check is case-sensitive, but the admin comparison is case-insensitive. This means the database can accept distinct case variants such as `ceo` and `CEO`, while the admin rule treats them as the same name. Since anyone can register, a username on the admin allowlist is effectively a public path to admin status. Configure a CEO username and this becomes a privilege-assignment risk.

**Recommended design:** make usernames case-insensitively unique, and grant admin through a controlled operator action or a database-backed role that public registration cannot set. Keep authorization checks on the backend; hiding an admin page in the frontend is not sufficient security.

## 4. What is working well

- **Clear backend organization.** The code has distinct API, service, repository, model, authentication, and AI-provider modules.
- **Useful authentication basics.** Passwords are hashed, failed login returns an unauthorized response, refresh tokens are stored server-side, and logout invalidates the refresh token.
- **Server-enforced admin checks.** The admin statistics endpoint requires backend admin authorization; the browser UI is not the only gate.
- **Automated regression coverage.** Auth, security, profile, integration, and feature tests are present and passed locally.
- **Thoughtful career product flow.** Resume analysis, job discovery, interview practice, goals, and roadmaps can support a connected student/job-seeker experience rather than a set of unrelated tools.
- **Secrets are designed to be supplied through deployment configuration.** This review did not identify a tracked `.env`, `.pem`, or private-key file in Git’s tracked file list. This is a narrow filename check, not a complete secret-scanning certification.

## 5. Risks and gaps, explained

| Priority | Finding | Why it matters | Recommended action |
|---|---|---|---|
| **P0 — before production admin access** | Admin is assigned by matching a username from `ADMIN_USERNAMES`; matching ignores case, but account uniqueness does not. Registration is public. | A public signup can claim an allowlisted name or a case variant and receive the admin role. | Stop assigning admin through public username matching. Add controlled role provisioning, case-insensitive username uniqueness, and regression tests. |
| **P1 — before promising resume storage** | Resume storage is optional. Without Supabase URL and service-role configuration, upload can keep metadata/extracted text without retaining the original file bytes. | A person may believe their resume is saved, but the original document may not be available later. | For production, require and health-check private object storage, or clearly state that only extracted information is saved. Test upload, retrieval, deletion, and ownership. |
| **P1 — account security** | Access tokens are kept in browser local/session storage and configured to expire after one week. | Browser JavaScript can read these tokens; a frontend script-injection issue would have a larger impact. | Review a secure session design, preferably secure HttpOnly cookies where compatible, and strengthen refresh rotation, expiry, and revocation tests. |
| **P1 — user identity contract** | Auth responses return tokens and role but not a user ID or canonical user profile. The UI labels the field “Email or username,” while backend lookup uses username. | Clients cannot reliably display/confirm a stable user ID, and the sign-in label promises more than the backend supports. | Return a small, documented user object or add an authenticated `/me` endpoint. Align the label with supported sign-in identifiers. |
| **P1 — account recovery** | The “Forgot?” control says password reset is not available. | People who lose access have no self-service recovery path. | Before public launch, implement verified email reset or clearly provide a supported recovery process; otherwise remove the reset affordance. |
| **P0 — live AI response** | A real deployed Copilot request returned HTTP `200` with `AI is temporarily unavailable. Please try again.` The public status panel showed Google Gemini `OK`; the backend health endpoint hard-codes the AI gateway status to `ok`. | Users can receive a success-shaped HTTP response that contains no AI answer, and the displayed status is not a real provider health check. | Fix or reconfigure the actual provider path, expose provider failure as degraded/unavailable status, and show a clear error to the user. Add a live smoke check with non-sensitive test input. |
| **P1 — direct page navigation** | Client-side navigation works, but direct requests to `/career-copilot`, `/admin`, and `/api/health` on Netlify return 404. | Bookmarks, reloads on feature pages, and direct API health checks fail, even while the root app works. | Verify the deployed Netlify redirect/rewrite configuration and deploy the SPA fallback and API proxy. Test both direct navigation and reload on every route. |
| **P1 — AI provider configuration** | The gateway attempts Hugging Face first, then Gemini if configured, then Ollama. Existing docs disagree about which provider is primary. | “Configured” is not the same as “reachable and producing useful output”; the product can behave differently from the docs. | Choose and document the intended provider order and make health report verified provider availability, not merely configuration. |
| **P2 — deployment predictability** | Application startup attempts a Google Sheets job sync and continues after a caught exception. | A third-party service is coupled to API startup; operators may miss a failed sync or see behavior change on restart. | Move the sync to a scheduled/explicit job and expose its last-success time and error status. |
| **P2 — browser journey coverage** | Backend tests pass, but the frontend package has no test script. The live browser check covered signup and authenticated reads, not the full resume-to-career journey or explicit password login. | Build success does not test every user journey or prove that resume upload and AI responses work end to end. | Add browser tests for signup, login, logout, refresh, guest mode, admin denial/grant, and a complete candidate workflow. |
| **P2 — auth implementation clarity** | The repository includes an Axios client that reads different token keys from the main auth module; no frontend import was found in the reviewed source. | Two token strategies create confusion and can become inconsistent if the extra client is used later. | Confirm there are no external/generated consumers; if unused, remove the Axios client and document the single supported API/auth path. |
| **P3 — documentation accuracy** | Existing readiness reports list 190 backend tests and describe Gemini as primary, which does not match this run’s 199 tests or the current gateway order. | Operators and decision-makers may act on a report that no longer describes the code. | Keep one dated, evidence-based readiness report and update it whenever the implementation or test count changes. |

## 6. What to keep, change, or remove

### Keep

- The modular FastAPI backend and its service/repository boundaries.
- The React/TypeScript frontend and the current career-tool journey.
- Backend-enforced ownership and admin checks.
- The repeatable in-memory test setup for fast, isolated backend verification.
- The AI provider abstraction, while making its actual configured order and health status explicit.

### Change

- Replace username-based public admin assignment with controlled, persisted role provisioning.
- Make username normalization and uniqueness consistent across registration, login, and role checks.
- Define the user/auth API contract, including a stable user ID and truthful sign-in labels.
- Treat resume storage as a production dependency if retaining the original file is part of the user promise.
- Make session lifetime, refresh rotation, and browser storage deliberate security choices.
- Add browser-level tests and operational health checks.
- Bring architecture and launch-readiness documents into agreement with the code.

### Remove only after confirming they are unused

- The separate Axios client at [`frontend/src/api/client.js`](../frontend/src/api/client.js) appears unused by the reviewed frontend source and uses different token names. Do not delete it blindly if an untracked or external consumer uses it; first confirm the intended API path, then remove the duplicate.
- Remove outdated “certified production ready” statements from old reports once a new release gate is established. Do not remove useful historical records; mark them as superseded instead.

## 7. Recommended delivery plan

### Phase 1 — Secure accounts

1. Decide how the founder/CEO account is provisioned; do not make a public username special.
2. Add a persisted role and a controlled initial-admin procedure.
3. Normalize usernames and enforce case-insensitive uniqueness.
4. Add tests proving public registration cannot acquire admin and case variants cannot bypass uniqueness.
5. Return the stable user ID and role from a documented current-user/auth response.

**Exit condition:** a new public user cannot become admin by choosing a username, and an authorized operator can reliably provision and verify the intended admin account.

### Phase 2 — Protect user data and sessions

1. Decide whether original resumes must be retained.
2. If yes, make private object storage required in production and verify upload/retrieval/ownership/deletion.
3. Review token storage and refresh-token rotation/revocation.
4. Implement a supported account-recovery path before broad public signup.

**Exit condition:** users know what is retained, can recover access, and cannot access another user’s stored data.

### Phase 3 — Verify real deployments

1. Add browser E2E tests using disposable accounts and test data.
2. Verify the deployed API URL, CORS origins, database migrations, storage, and AI health.
3. Move Sheets sync out of API startup and make job sync status observable.
4. Run a controlled smoke test after deployment; avoid sending private resume data to test providers.

**Exit condition:** an independent tester can register, sign in, complete a candidate workflow, refresh the session, and sign out in the deployed environment.

### Phase 4 — Reassess launch readiness

Update the readiness report with the deployment version, test results, live checks performed, known limitations, and who approved release. A passing test suite is necessary, but it is not by itself a production certification.

## 8. CTO recommendation

**Keep developing Saarthi; do not discard the project.** It has a coherent product direction and a backend/frontend foundation that passes local automated checks.

**Do not describe the current deployment as fully production-ready yet.** The deployed signup and several authenticated API reads work, but live AI failed and direct routes return 404. First fix admin provisioning, live AI availability/status, and deployed routing. Then confirm durable resume handling, define a trustworthy user/session contract, and verify the complete browser journey and external integrations.

### Evidence and related files

- Authentication and admin configuration: [`backend/app/services/auth_service.py`](../backend/app/services/auth_service.py), [`backend/app/core/dependencies/auth.py`](../backend/app/core/dependencies/auth.py), [`backend/app/core/config.py`](../backend/app/core/config.py)
- Auth API and response schema: [`backend/app/auth/auth.py`](../backend/app/auth/auth.py), [`backend/app/schemas/auth.py`](../backend/app/schemas/auth.py)
- Account storage and admin tests: [`backend/app/models/models.py`](../backend/app/models/models.py), [`backend/tests/test_auth.py`](../backend/tests/test_auth.py), [`backend/tests/test_intelligence_service.py`](../backend/tests/test_intelligence_service.py)
- Frontend sign-in and token storage: [`frontend/src/pages/AuthPage.tsx`](../frontend/src/pages/AuthPage.tsx), [`frontend/src/lib/auth.ts`](../frontend/src/lib/auth.ts), [`frontend/src/services/api.ts`](../frontend/src/services/api.ts)
- Resume storage: [`backend/app/services/storage_service.py`](../backend/app/services/storage_service.py)
- AI provider order: [`backend/app/ai/gateway.py`](../backend/app/ai/gateway.py)
- Startup sync and deployment: [`backend/app/main.py`](../backend/app/main.py), [`render.yaml`](../render.yaml)
- Earlier readiness documents to reconcile: [`docs/FINAL_LAUNCH_READINESS.md`](./FINAL_LAUNCH_READINESS.md), [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)

## 9. Live deployment verification — October 24, 2026

### What succeeded

- The Netlify root page `https://saarthi-link.netlify.app/` loaded and rendered the Saarthi app.
- The signup form created a disposable non-admin account and placed the browser into authenticated state.
- The Render backend health endpoint responded with API/database status `ok`.
- Authenticated requests using the new account succeeded for profile, profile completeness, career dashboard, jobs, saved jobs, goals, sessions, workspaces, resume history, saved roadmaps, Graduate Hub lists, mission status, and feedback feature definitions.
- The normal account received `403 Admin access required` from `/api/admin/stats`, as expected.
- Refresh returned `200` with a new access token and `user` role. Signing out cleared access and refresh tokens in browser storage.
- Sidebar navigation rendered the main dashboard, profile, AI coach, Career Copilot, goals, workspaces, resume, job finder, interview coach, roadmaps, Graduate Hub, Growth Lab, Career Toolkit, and Discovery screens. This checks that those frontend screens load; it does not prove every action on every screen works.
- The jobs list returned job records. The new account’s saved-job, goal, session, workspace, resume-history, roadmap, and Graduate Hub lists were empty, as expected for a fresh test account.

### What failed or remains uncertain

- **AI response failed:** `POST /api/career/copilot/stream` returned HTTP `200` with only `AI is temporarily unavailable. Please try again.` No actual guidance was returned.
- **Health reporting is misleading:** Render `/api/health` returned API/database `ok`, Redis `unavailable`, and AI gateway `ok`. The AI gateway value is not proof that Gemini or Hugging Face can answer a request; the real Copilot call above failed. The frontend’s integration panel also showed Gemini `OK` at the time.
- **Direct routes fail:** Opening `/career-copilot` directly, or directly opening `/admin`, returned the Netlify “Page not found” page. These routes work through in-app navigation but not as direct URL loads.
- **Netlify API proxy path fails:** `https://saarthi-link.netlify.app/api/health` returned Netlify’s HTML 404 page. The frontend did reach the Render API using its configured absolute API URL, so app API calls can work while the Netlify-relative proxy path is broken.
- **Redis is unavailable:** The health response reports Redis `unavailable`. Core tested reads still worked; Redis-dependent caching/coordination behavior was not separately evaluated.
- **Resume processing and file retention were not tested with a document.** No real or synthetic resume was uploaded to the live service.
- **Google Sheets and Supabase object storage were not tested.**
- **The login form itself was not separately tested against the new account.** Signup returned an authenticated session; profile reads, refresh, and logout were verified.

### Operational note about the disposable account

The live test account is a normal user, not a CEO/admin account. Its profile response showed database user ID `7`; the account remains in the deployed database, and the browser session was logged out. No password was retained. The account ID is scoped to the currently deployed database and should not be treated as a permanent external identifier without a documented user API.

### Live release decision

**Current live status: not ready for broad public launch.** The signup and core authenticated read paths work, but the AI response failure and direct-route 404s are user-visible release blockers. Treat AI as unavailable until a real answer is returned from the deployed provider; treat route handling as incomplete until direct loads and refreshes work for application routes. Re-test resume persistence and the complete candidate journey after those fixes.
