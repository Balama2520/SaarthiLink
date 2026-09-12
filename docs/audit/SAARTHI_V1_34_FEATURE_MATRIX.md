# Saarthi V1 34-feature matrix — live audit addendum

Audit date: 2026-09-09. Statuses are evidence-based; source existence is not treated as verification.

| # | Feature | Status | Evidence / problem |
|---|---|---|---|
| 1 | Dashboard | VERIFIED | Guest dashboard rendered; live `/career/dashboard` returned 200 for authenticated test user. |
| 2 | Profile | VERIFIED | Live profile and completeness APIs returned 200; 87-test suite covers update/persistence. |
| 3 | Profile completeness | VERIFIED | Live `/profile/completeness` returned 200; calculation source is backend profile route/service. |
| 4 | Skills | NOT IMPLEMENTED | No dedicated skill CRUD UI/API was found; skills are derived/synced from resume. |
| 5 | Resume upload | BROKEN | Runtime health reports Supabase Storage `unconfigured`; bytes cannot meet the required permanent object-storage path. |
| 6 | Resume analysis | AI-BLOCKED | Gemini and Ollama both failed network calls after retries; API retained a graceful failed/fallback response. |
| 7 | ATS | AI-BLOCKED | ATS extraction depends on the blocked resume AI pipeline. |
| 8 | Resume versioning | VERIFIED | Versioning is persisted in `Resume.version`; integration test passes. |
| 9 | Resume-to-profile sync | VERIFIED | Ownership check and sync route are covered by security/integration tests. |
| 10 | Job board | DATA-BLOCKED | Search/recommendation endpoints returned 200; live seeded/external-job completeness was not available. |
| 11 | Job recommendations | DATA-BLOCKED | Endpoint returns 200; no external job corpus was supplied for relevance validation. |
| 12 | Saved jobs | BROKEN | Guest UI emitted `Failed to load saved jobs` console errors instead of treating expected unauthenticated state cleanly. |
| 13 | Goals | VERIFIED | Live Person A created a goal; Person B GET by A's ID returned 404. |
| 14 | Career Copilot | AI-BLOCKED | Provider unreachable; fallback path observed. |
| 15 | Career roadmap | AI-BLOCKED | Live request returned a graceful fallback after Gemini/Ollama failure. |
| 16 | Skill gap | VERIFIED | Live `/career/skill-gap` returned 200. |
| 17 | Job strategy | NOT IMPLEMENTED | No distinct user-facing job-strategy workflow was found. |
| 18 | AI chat | AI-BLOCKED | Live streaming returned friendly unavailable text rather than a crash. |
| 19 | Memory | NOT TESTED | Persistence across independent chat sessions was not demonstrated against the live deployment. |
| 20 | Learning roadmaps | AI-BLOCKED | Same provider outage/fallback path as feature 15. |
| 21 | Interview coach | AI-BLOCKED | Live evaluation returned graceful fallback after provider failure. |
| 22 | Skill Forge | AI-BLOCKED | Live generator returned graceful fallback after provider failure. |
| 23 | Research Hub | AI-BLOCKED | Live analysis returned graceful fallback after provider failure. |
| 24 | Experiment Studio | NOT IMPLEMENTED | No page is routed in `frontend/src/App.tsx`; experiments router file is absent. |
| 25 | Graduate Hub | VERIFIED | Live list endpoints returned 200; create/delete flows are test-covered. |
| 26 | Admissions | NOT IMPLEMENTED | No admissions page/router is routed. |
| 27 | Study Notes | AI-BLOCKED | List endpoint returned 200; generation requires blocked AI. |
| 28 | Workspaces | VERIFIED | Live list endpoint returned 200; isolation tests cover owner-scoped resources. |
| 29 | Admin panel | VERIFIED | Live guest=401, normal user=403; privileged path is covered by tests. |
| 30 | Personas | BROKEN | Selector is visible, but there is no backend persistence or demonstrated persona-specific dashboard behavior. |
| 31 | Daily mission | VERIFIED | Live mission endpoint returned 200; completion route is covered by backend tests. |
| 32 | Career health | VERIFIED | Career dashboard endpoint returned 200; values are backend service output. |
| 33 | Career toolkit | AI-BLOCKED | UI and routes exist; its generators depend on unavailable AI. |
| 34 | Authentication final test | VERIFIED | Live register/login/refresh/logout passed; automated test confirms post-logout refresh=401. |

Release result: **SAARTHI V1: BLOCKED**.
