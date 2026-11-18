# Ziro Digital — Read-Only CTO Portal Review

**Review date:** October 24, 2026  
**Scope:** Public pages plus owner-authorized, signed-in read-only portal review  
**Changes or submissions:** None

> This is a read-only browser review, not a source-code, database-operator, penetration-test, or full end-to-end write-flow audit. The account owner authorized viewing. No credentials were entered; no exams were started/submitted; no AI prompt was sent; no point was spent; and no profile, project, progress, or account data was changed.

## 1. Executive summary

Ziro’s public site positions itself as a career and skills-intelligence platform centered on assessments, coding practice, role fit, communication readiness, and a shareable Skill Passport. The signed-in portal reviewed here exposes a broad workflow covering career onboarding, daily missions, learning, exams, AI assistants, project building, jobs, profile/career data, readiness, rewards, and reports.

The account owner later explicitly authorized read-only viewing of the signed-in dashboard and feature pages. This review inspected representative pages and the browser-visible API resource paths naturally requested while those pages loaded. It did not test state changes, persistence after a write, scoring correctness, AI response quality, or account isolation.

**CTO conclusion:** the product is a multi-module, data-backed platform rather than only a landing page. The UI and API resource names suggest a centralized identity/profile layer plus domain-specific records and RPC-style operations for career progress, skills, exams, and points. Exact frontend/backend frameworks, database engine, schema constraints, AI providers, and security policy remain unverified without source and operator access. Several visible scores are defined differently across modules, and the dedicated Rewards Store says physical rewards are no longer available—details that should be reconciled with dashboard messaging.

## 2. What was observed directly

### Public landing page

The public page describes a workflow around:

- Skill assessments and role-specific skill maps.
- Coding/problem-solving practice.
- Role-fit analysis and AI-described skill-gap analysis.
- Communication readiness.
- A placement-readiness track.
- A recruiter-shareable Skill Passport.
- Additional product areas linked as ZiroLab, Ziro Workspace, ZiroLearn, Agent Studio, and AutoApply.

The page displays numerical marketing claims such as assessment counts and role-map counts. These were observed as page text and **not independently validated**.

The public site includes a disclaimer that startup-program membership does not imply investment, endorsement, or guaranteed benefits to individual students. This is a useful clarification for visitors.

### Login and signup

The login screen displayed:

- Google sign-in.
- Email and password sign-in.
- A Sign Up tab.
- A Forgot password link.

The signup panel requested a full name, phone number, email, and password. The visible password guidance stated a minimum of six characters, with at least one letter and one number. I did not submit the form or test whether the backend enforces those rules.

### Browser errors

During public page loading, the browser reported some third-party/resource errors, including HTTP **402** and **429**, and a blocked analytics resource. The source and impact were not determined. These observations do not prove that core product APIs are failing.

## 3. Authenticated dashboard content supplied by the user

The user also supplied a text dump of the dashboard. In this review, the authenticated portal was subsequently inspected in read-only mode with the account owner's explicit permission. The dashboard text is therefore useful context, but any feature claim still needs to be distinguished from a working AI result, completed server-side transaction, or independently verified database value.

## 4. Architecture and behavior that remain unknown

Without application source code, backend logs, or database/operator access, this review cannot establish:

- Frontend framework, backend language/framework, hosting topology, or API architecture.
- Database technology, schema, backups, restore process, or retention policy.
- Whether dashboards, exam attempts, progress, Ziro Points, and rewards persist correctly.
- Whether points are idempotent, protected from duplicate rewards, or reversible after mistakes.
- Whether assessment scoring is deterministic, AI-generated, human-reviewed, or a combination.
- Which AI providers/models are used, how failures are surfaced, and what student data is sent to providers.
- Whether account, exam, project, or payment-related operations enforce user ownership and role boundaries.
- Whether any employer/recruiter visibility is consent-based and revocable.

## 5. CTO recommendations for the product team

1. **Make system status meaningful.** Distinguish “configured” from “reachable” and “successfully completed a real test.” Surface partial outages clearly.
2. **Explain the Skill Passport evidence model.** Show what evidence contributes to each score, how it is verified, when it expires, and how a student disputes or corrects a result.
3. **Make AI use transparent.** Identify AI-powered features, data sent, retention, human review, and fallback behavior.
4. **Make the points ledger auditable.** Display each award/spend with source event, timestamp, rules, and a support/dispute route. Test duplicate submissions and retries.
5. **Use clear assessment controls.** Explain attempt limits, timing, scoring criteria, accommodations, feedback, and how results affect readiness scores.
6. **Keep marketing claims measurable.** Publish the definition, date range, and calculation behind counts such as platform activities and assessments.
7. **Avoid collecting more signup data than necessary.** Explain why phone number is required, how it is used, and how it can be updated or deleted.

These are recommendations based on the public product surface, not findings of confirmed backend defects.

## 6. Safe plan for a future end-to-end review

A deeper write-flow review should use a dedicated test account owned by or provisioned for the reviewer, synthetic profile data, and a non-production tenant if available. Obtain explicit permission for each write-capable operation before testing:

1. Sign-in, recovery, session expiry, and sign-out.
2. Dashboard data versus source-of-truth API values.
3. A test assessment with documented scoring and retry behavior.
4. A synthetic AI prompt, provider/fallback behavior, and privacy handling.
5. A test project submission and review path.
6. Points accrual, duplicate prevention, spending, refunds/corrections, and ledger history.
7. Two-account isolation for profile, projects, results, and shared Skill Passport visibility.
8. Database persistence, backup/restore, and operational monitoring with operator approval.

Do not use a real student’s personal data, attempt an actual exam, or spend actual points in a verification run.

## 7. Public-scope assessment (initial pass)

**Public-site status:** landing page and login/signup interface were viewable.  
**Backend/database/AI status:** not verified.  
**End-to-end status:** not tested in that initial public-only pass.

The public product story is broad and ambitious. The sections below add the later owner-authorized read-only portal observations. Operational claims still require controlled test workflows and source/operator evidence.

## 8. Authenticated portal review — owner-authorized, read-only

### 8.1 Dashboard and connected journey

The dashboard groups the product into a career journey rather than one isolated feature:

- Daily plan and mission tasks.
- Career coach and named mentor/agent experiences.
- Career readiness, discipline, and activity summaries.
- Skill Passport and readiness entry points.
- Courses, live/recorded classes, English, aptitude, coding/lab practice, and exams.
- Projects, resume tools, job discovery/application tracking, internship, and placement preparation.
- Ziro Points wallet, earn methods, rewards, and recent activity.

The dashboard appears to aggregate signals from several product areas. The menu exposes many separate destinations, so it functions as a large product shell/portal. A visible module status label (“Live” or “Available”) is a product/UI label; this review did not exercise the corresponding AI tool or verify its runtime.

### 8.2 Placement-readiness flow

The placement-readiness view showed a guided progression from a career goal through a baseline assessment, RoleFit, technical skills, communication, English, aptitude, AI placement-readiness review, a final mentor mock, mentor/HR review, interview assignment, and placement.

The first step asks the student to provide a target role, domain, salary expectation, confidence, availability, preferred cities, and skills. The screen showed **0/100 readiness and 0% progress** while prompting the user to set a goal. I did not fill or save these fields.

The dashboard exposes a useful sequence and visible next steps. However, the final readiness score is a composite of multiple signals, and the reviewed UI does not fully explain its formula, evidence weighting, stale-data handling, or how an incorrect signal is corrected.

### 8.3 Career evidence and profile

The Career Vault describes itself as reusable profile data for job matching, Resume AI, applications, and interview preparation. It exposes sections for personal information, career goals, education, skills, projects, experience, certifications, achievements, resumes, and interview notes.

The 360° Career Evidence report presents separate indicators for profile, assignments, activity, interviews, doubts, projects, resume/role alignment, applications, and upcoming interviews. The observed page showed some areas with evidence and others at zero or unknown. This is more transparent than a single opaque score, but the user-facing product has multiple readiness/evidence summaries with different definitions.

The Skill Passport flow says students select skills, complete assessments, receive an AI/structured verified score, generate a Skill ID card, check job fit, and produce a shareable proof URL. The reviewed account view showed an empty/early skill state. A public recruiter-preview page stated that only verified evidence is shown and that unavailable evidence is not inferred. Because the passport is explicitly shareable, owners should have clear visibility, expiry/revocation, and field-level privacy controls.

### 8.4 Exams and results

The RoleFit page listed job-focused assessments, described them as proctored, and showed expected durations in the range of roughly 75–120 minutes. I reviewed the catalog only; I did not click “View & Start,” begin an exam, or test proctoring.

The account’s results area displayed a prior graded assessment and offered a detail report. The report decomposed a hiring evaluation into multiple rounds/categories and displayed integrity/review information, including a recommendation for human review. This suggests the platform represents more than one raw score, but I could not validate the scoring rubric, AI evaluator, proctoring signals, attempt integrity, or reviewer workflow.

**Important:** the results page is an assessment history for one account, not proof that other students’ results are isolated or that score computation is correct.

### 8.5 Points and rewards

The Ziro Points page explains earning categories and rules, including daily activity, communication practice with a cap, interviews with a cap/score tiers, first valid assignment submission, weekly tests, recording quizzes, and daily aptitude work. It presents a wallet, lifetime/tier progress, daily and weekly summaries, an activity history, and redemption entry points.

The dedicated Rewards Store states that **physical reward redemptions are no longer available** and directs users toward Ziro access and available AI-powered tools. This is important to keep aligned with dashboard copy that may imply a broader reward catalog.

The UI describes rules, but this review did not test whether points are credited exactly once, whether duplicate or delayed events are handled, whether spends are atomic, or whether a disputed/reversed award can be corrected.

### 8.6 AI tools and projects

- The AI Career Coach page showed a setup/onboarding flow asking for a goal, current level, and timeline. It was not completed.
- The BuildAI page showed a workspace/initialization screen with an entry button. I did not enter the workspace.
- The mentor/dashboard cards advertised AI career, interview, communication, resume, skill, placement, and project guidance. No prompts were sent and no outputs were evaluated.
- A route intended for AI assistance did not render meaningful content during the short direct navigation check. This may be transient or route/state-specific; it is not enough evidence to call the whole feature broken.

The actual model vendor, model version, retrieval pipeline, tools, prompt/data retention, content-safety controls, and provider fallback behavior were not exposed by these screens.

### 8.7 Browser-visible data/API architecture

When the signed-in portal loaded, browser resource records showed requests to `auth.ziro.digital/rest/v1/...`, including paths associated with identity/profile, access/entitlements, wallet/ledger/rewards, courses/batches, skill profiles/results/definitions, exams/attempts, placement readiness, applications, and student-session/report functions.

The `/rest/v1` paths and `/rpc/...` function naming are **consistent with a PostgREST/Supabase-style API surface**. This is an architecture clue only. It does not prove the underlying database vendor, database engine, schema, policies, or whether every page uses the same backend. The reviewer did not copy request query strings, tokens, record IDs, or response payloads into this report.

Resource records also showed telemetry/error-monitoring/analytics endpoints. This indicates telemetry integrations are present in the browser environment; it does not prove that alerts are configured, triaged, or operationally monitored.

### 8.8 Published system-status page

The linked Better Stack status page showed “All services are online” and listed the website, dashboard/login, live classes, practice/exams, and AI tools/resume engine as operational at the time of review. One displayed uptime chart showed 100% for the website over its displayed 90-day period.

This is the provider’s published status page, not an independent uptime measurement and not a live AI response test. It should be read alongside actual user-level smoke tests.

## 9. Cross-module inconsistencies and operational risks

| Priority | Observation | Why it matters / next check |
|---|---|---|
| **High** | Readiness appears in multiple places: dashboard percentage, a 360° report with readiness “Unknown,” Skill Passport completion/verified-skill counts, and a separate placement-readiness dashboard. | These may be distinct metrics, but the UI needs definitions, data freshness, and a clear explanation of how they relate. Confirm all are calculated from a common evidence model. |
| **High** | Placement readiness is a long gated sequence (goal, baseline, role fit, technical, communication, English, aptitude, review, mentor, HR, placement) and starts at 0 until setup/evidence exists. | Make gates, prerequisites, optional steps, and completion criteria explicit; avoid making an empty account appear “failed.” |
| **High** | Points/rewards messaging spans dashboard, mission cards, wallet, earn rules, and a store that says physical redemptions ended. | Keep advertised reward methods and point amounts synchronized with the active catalog and ledger rules. Make terms, caps, expiry, and reversal/refund behavior discoverable. |
| **High** | The recruiter-visible Skill Passport is a shareable public profile. | Provide user-controlled consent, preview, selective disclosure, expiry/revocation, and audit visibility for shared links. |
| **Medium** | The product surface contains many named agents and areas labeled Live/Available, but the current scope did not exercise AI. | Publish per-feature status and a non-sensitive health check that verifies an actual response, not just configuration. |
| **Medium** | Proctored assessment listings show long expected duration, while scoring details/reviewer explanation are not fully established from the list view. | Publish exam rules, consent/privacy notice, accommodations, retry policy, evaluator provenance, and appeal process before attempt. |
| **Medium** | The Career Coach setup and readiness route request career goals and preferences. | Explain which fields are required, where they are stored, how they affect recommendations, and how a student can change/delete them. |
| **Medium** | Browser errors included repeated 402/429 responses and blocked/aborted third-party requests on some pages. | Determine whether these are analytics noise, quota/billing issues, or product API failures using server-side telemetry; do not diagnose from browser console alone. |

## 10. Evidence boundaries

| Area | Status |
|---|---|
| Public landing and login/signup UI | Observed |
| Signed-in dashboard and representative module screens | Observed read-only with owner permission |
| Ordinary browser-visible REST/RPC resource path names | Observed; query parameters/payloads intentionally omitted |
| Data values rendered for the authorized account | Observed only as UI outputs; personal details omitted |
| Frontend source and exact framework/build architecture | Not verified |
| Backend source, route implementation, and authorization policies | Not verified |
| Database vendor/schema/indexes/RLS/backups/restore | Not verified |
| Write persistence, transactionality, idempotency, and cross-account isolation | Not tested |
| AI response quality/provider/fallback/data retention | Not tested |
| Exam proctoring, grading correctness, and appeals | Not tested |
| Points credit/spend/reversal integrity | Not tested |
| Account-specific end-to-end business outcomes | Not tested |

## 11. Final CTO assessment and next steps

Ziro presents a broad career platform with a comparatively mature journey concept: collect career evidence, measure skill/communication readiness, convert gaps into practice, track activity, and package evidence for recruiters. The platform’s visible data model appears to organize identity, profile, access, learning, skills, exams, wallet/ledger, jobs/applications, and readiness functions behind a REST/RPC API.

For Saarthi, the most reusable product lessons are:

1. **One canonical career evidence model:** reuse profile/resume/skills/goals across matching, coaching, roadmaps, and readiness; keep facts separate from inferred scores.
2. **A visible next action:** dashboard cards should tell a student what to do next and why it matters, without mixing unrelated modules.
3. **A transparent progress ledger:** every score should show its inputs, denominator, timestamp, and next step.
4. **Points only with auditable rules:** implement event-based credit, idempotency, caps, a ledger, and clear redemption inventory.
5. **Shareable career proof with privacy controls:** preview, choose fields, revoke, expire, and record access.
6. **Operational truth over marketing labels:** “AI available” should be backed by a successful non-sensitive health response, and outages should appear as degraded.
7. **A controlled assessment loop:** clear consent, proctoring notice, scoring rubric, review/appeal path, and evidence-backed feedback.

**Current verification verdict:** the signed-in product UI and a REST/RPC-style data integration were observed. The read-only scope did not permit the write, AI, or exam actions required to call this a complete end-to-end test. Treat the backend, database integrity, AI operation, and exam/points transaction correctness as **unverified**, not passed.
