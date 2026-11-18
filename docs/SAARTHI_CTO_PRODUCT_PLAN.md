# Saarthi — CTO Product Approval & Delivery Plan

**Date:** October 24, 2026  
**Decision audience:** Founder, product, and engineering  
**Basis:** Saarthi repository/deployment assessment and read-only reviews of the Ziro and Nexvia student portals  
**Decision:** **Approve the product direction and phased plan. Do not approve a broad production launch until the critical trust and reliability gates below pass.**

## 1. Executive decision

Saarthi should become a **proof-backed career copilot for students**: help a student choose a career goal, take a useful next action, build evidence of skills, and use that evidence to improve career opportunities.

The reviews of Ziro and Nexvia show useful patterns:

- Ziro connects career profile, practice, assessments, readiness, and recruiter-facing evidence.
- Nexvia provides a visible learning-to-project path with curriculum and capstone work.
- Both reviews also expose risks to avoid: too many disconnected modules, unclear progress definitions, and difficult-to-correct submissions.

Saarthi already has a foundation in resumes, jobs, interview practice, goals, and roadmaps. The best next step is to **connect and stabilize what exists**, not to copy every competitor feature or expand the menu.

### Approval status

| Decision | Status | Rationale |
|---|---|---|
| Product direction: goal → action → evidence → opportunity | **Approved** | Clear student value and consistent with Saarthi's existing career features. |
| Stabilization work before expansion | **Approved; highest priority** | Prior assessment identified account-role, live AI, route, and data-retention gaps. |
| Build a single Career Home using existing features | **Approved for discovery and phased implementation** | Improves coherence without first creating a large new feature set. |
| Add verified progress/evidence and guided projects | **Approved in principle; gated** | Implement only with clear definitions, privacy, correction, and persistence rules. |
| Add points, many AI agents, or a public skill passport immediately | **Not approved for this phase** | These add operational, privacy, and trust obligations before core journeys are dependable. |
| Declare production readiness based on this report | **Not approved** | This is a product/delivery decision, not a new technical verification or security certification. |

## 2. Product principle

Every student-facing feature should support this loop:

> **Choose a goal → take the next action → build evidence → use the evidence to improve opportunities.**

The experience should make it easy to answer:

1. What am I working toward?
2. What is the most useful thing to do next?
3. What evidence shows my progress?
4. How can this evidence help me get an interview or job?

Prefer a small number of connected, dependable journeys over a large catalogue of features.

## 3. Proposed product scope

### Keep and connect

- Resume analysis and career profile.
- Job discovery and job-fit guidance.
- Interview practice.
- Career goals and learning roadmaps.
- Existing AI provider abstraction, after provider health and failure handling are made truthful.

### Add in sequence

1. **Career Home:** one selected goal, a concise progress summary, and one recommended next action with a reason.
2. **Career evidence:** a shared, understandable record of completed actions, projects, skills, and relevant profile facts.
3. **Guided project path:** learning milestone → project work → submission → feedback → revision → optional portfolio evidence.
4. **Evidence-aware copilot:** recommendations grounded in the user's saved profile and activity, with clear indication of what is verified versus suggested.
5. **Optional sharing:** only after consent, preview, selective disclosure, expiry/revocation, and access visibility are designed.

### Defer

- Points, tiers, and rewards until there is a useful redemption purpose and a reliable ledger.
- Multiple branded AI agents until each has a distinct use case and measurable quality.
- Proctored assessments unless there is a clear need, consent model, accommodations, grading policy, and appeal path.
- A broad public recruiter passport until its privacy and revocation model is implemented.
- New modules that duplicate existing resumes, roadmaps, interview practice, or job functionality.

### Remove or hide

- Broken or unavailable destinations that are currently presented as live.
- Duplicate progress percentages that lack a clear definition and source.
- Controls that imply functionality that is unavailable, such as password reset without a working recovery path.
- Duplicate API/auth paths after confirming they are unused and documenting the supported path.

Do not delete historical reports or features blindly. Confirm usage and dependencies first; mark old assessments as superseded where appropriate.

## 4. Delivery plan and gates

### Phase 0 — Stabilize trust and deployment

**Objective:** Ensure users can safely access accounts, get honest AI status, and understand what data is retained.

**Work**

- Replace username-based public admin assignment with a controlled, persisted role-provisioning process.
- Normalize account identifiers and enforce matching uniqueness rules.
- Return a stable user identity through a documented auth contract; align sign-in labels with supported identifiers.
- Implement a real account-recovery path or remove/replace the nonfunctional recovery affordance with clear support instructions.
- Make the AI health status reflect actual provider availability and distinguish an unavailable answer from a successful response.
- Ensure AI failures surface as explicit errors, not success-shaped empty/fallback responses.
- Fix SPA direct navigation and refresh for all supported routes and the intended API health path.
- Decide whether the product promises original resume-file retention. If it does, require private durable storage and verify retrieval and deletion; otherwise clearly describe what is retained.
- Confirm one frontend API/auth path and remove redundant clients only after verifying they have no consumers.

**Exit criteria**

- Public registration cannot acquire a privileged role by selecting a username or case variant.
- Tests cover role provisioning, identifier normalization, and denied admin access for ordinary users.
- An AI smoke test produces a real response when healthy and a clear degraded/error result when unavailable; status never reports healthy based only on configuration.
- Direct load and refresh work for every supported client route.
- Resume behavior is accurately communicated and, if file retention is promised, upload/retrieve/delete and ownership checks pass in a controlled test environment.
- Supported login identifiers and recovery behavior match the UI.

**Gate:** No broad production promotion until the security-sensitive account-role issue and live AI/status mismatch are resolved or explicitly blocked with a safe user-facing limitation.

### Phase 1 — Connect the existing career journey

**Objective:** Give each student a coherent next step without creating a large new module set.

**Work**

- Define a minimal Career Home around a chosen career goal, current state, and one next action.
- Reuse existing resume, jobs, interview, goals, and roadmaps rather than duplicating their data or UI.
- Explain why an action is recommended and how completing it helps the stated goal.
- Add empty, loading, stale, and unavailable states; do not convert missing data into a misleading zero score.

**Exit criteria**

- A new test user can identify their goal and the next action from the landing/dashboard view.
- The next action links to an existing working workflow.
- Each displayed summary has a named definition, source, and last-updated time.
- The UI clearly differentiates “not started,” “no evidence,” “not available,” and a measured score.
- A focused browser test covers sign-up/login, Career Home, one next action, refresh, and logout.

### Phase 2 — Establish one progress and evidence model

**Objective:** Make progress consistent, explainable, and reusable.

**Work**

- Define evidence types such as profile fact, completed learning action, assessment result, project milestone, and interview practice.
- Keep recorded facts separate from inferred recommendations or AI-generated assessments.
- Define progress terms precisely—for example, viewed, completed, passed, reviewed, and verified.
- Use the same server-derived evidence for dashboards and feature pages.
- Show source, date, status, and next step for each meaningful evidence item.

**Exit criteria**

- A single event/state transition produces consistent progress across relevant pages.
- Score definitions, denominators, freshness, and missing-data behavior are documented and visible where needed.
- Duplicate requests do not duplicate completion or credit.
- Tests verify authorized ownership boundaries and refresh/persistence behavior in a controlled environment.
- Users have a correction path for inaccurate profile or progress records.

### Phase 3 — Guided projects and portfolio evidence

**Objective:** Turn learning into demonstrable work and useful feedback.

**Work**

- Start with one small, end-to-end project path before offering a large project catalogue.
- Define milestones, deliverables, evaluation rubric, reviewer status, feedback, and revision.
- Use private-by-default uploads or restricted reviewer access.
- Provide submission confirmation, revision history, and a reasonable correction/resubmission window.
- Explain retention, reviewer access, and deletion.

**Exit criteria**

- A synthetic test submission can be created, reviewed, corrected, and resubmitted without exposing a public folder.
- Students can see the rubric, status, feedback, and next action.
- Submission ownership, reviewer access, and audit history are tested.
- Portfolio publication is opt-in and previews exactly what becomes visible.

### Phase 4 — Evidence-aware AI and optional sharing

**Objective:** Add differentiated assistance only after data and core journeys are trustworthy.

**Work**

- Use one career copilot first; ground recommendations in the user's relevant career profile and evidence.
- Show what context informed a recommendation and allow users to correct that context.
- Separate generated suggestions from verified student achievements.
- Establish provider/model transparency, data minimization, retention rules, cost limits, fallback behavior, and quality evaluation.
- Design sharing controls before exposing public career evidence: field selection, preview, consent, expiry, revocation, and access visibility.

**Exit criteria**

- AI recommendations can be evaluated against a defined quality set and fail safely when the provider is unavailable.
- User data sent to AI is documented and minimized.
- Users can distinguish suggestions from verified records.
- Shared links can be previewed, revoked, and expired; access is auditable.

## 5. Release metrics

Use operational and product metrics to decide whether to continue each phase. Avoid vanity counts.

### Reliability and trust

- Successful sign-in and session-refresh rate.
- Direct-route and page-refresh success rate.
- AI real-response success rate, provider failure rate, and time to detect failures.
- Resume retention/retrieval/deletion success where storage is promised.
- Role authorization regression-test results.

### Journey usefulness

- Percentage of new users who set a goal and reach a relevant next action.
- Completion rate for the recommended next action.
- Drop-off at each journey step, separated by loading/error/empty states.
- Percentage of recommendations tied to identifiable profile/evidence inputs.

### Evidence quality

- Agreement of progress state across dashboard and source feature pages.
- Duplicate completion/credit event rate.
- Time to resolve a user correction request.
- Percentage of project submissions with visible rubric, status, and feedback.

Set numeric targets after establishing a trustworthy baseline; do not invent targets that the current telemetry cannot measure.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Feature expansion outpaces reliability | Make Phase 0 an explicit release gate; limit each phase to a working end-to-end journey. |
| Conflicting progress scores reduce trust | Define one evidence vocabulary and server-derived source of truth before adding more readiness metrics. |
| AI output is unreliable or unavailable | Measure actual responses, surface degraded state, and keep user-facing actions useful without AI. |
| Public sharing exposes personal or student work | Default to private; require explicit preview/consent and support revocation and expiry. |
| Gamification creates ledger disputes | Defer points until event idempotency, auditability, correction, caps, and a real redemption catalogue exist. |
| A project submission is irreversible or inaccessible | Support restricted reviewer access, access checks, revision history, and correction windows. |

## 7. Immediate next actions

1. Treat the account-role provisioning and AI-health findings in the Saarthi assessment as release blockers.
2. Assign an engineering owner to each Phase 0 item and add regression tests before changing product scope.
3. Map current Saarthi routes and features to the proposed Career Home; identify duplicates and unavailable destinations.
4. Agree on the definitions for goal, next action, evidence, completion, and verification before implementing new progress UI.
5. Prototype Career Home using existing data, then validate the flow with students before building points, a public passport, or additional AI agents.

## 8. Final CTO decision

**Approve:** the Saarthi product direction and the phased roadmap in this report. Saarthi should differentiate through a focused, dependable student career journey—not by matching the total number of modules in larger platforms.

**Do not approve yet:** a broad production launch or claims that account security, AI availability, resume persistence, or complete student journeys are production-ready. Those claims require the Phase 0 exit criteria and controlled verification.

**Recommended first milestone:** complete Phase 0, then deliver a tested Career Home that connects the existing goal, roadmap, resume, interview, and job features into one clear next-action loop.

## 9. Source assessments

- [Saarthi project and production assessment](./FINAL_PRODUCTION_AUDIT.md)
- [Ziro read-only portal review](./ZIRO_PUBLIC_CTO_REVIEW.md)
- [Nexvia read-only portal review](./NEXVIA_PORTAL_CTO_REVIEW.md)

## 10. Implementation and verification status

**Local verification only; not a production approval.** The following changes have been implemented in the working tree: the Career Home dashboard, persisted account roles and safer role provisioning, case-insensitive username handling, clearer AI failure/health behavior, resume-retention disclosure, and supporting deployment guidance.

**Verified locally**

- Backend suite: 206 tests passed.
- Frontend TypeScript/production build and ESLint passed.
- Role migration: a normal schema upgraded successfully; case-variant duplicate usernames were rejected, and pre-existing duplicates stop the migration with an operator-cleanup error.
- Fresh isolated SQLite migration to head completed.
- Browser signup, logout, login, dashboard refresh, and mobile-width layout were checked against the local preview; there was no horizontal overflow at 390px.
- `/auth/me`, Career Home API, ordinary-user admin denial, and duplicate case-variant registration were checked against an isolated local database.
- Eleven primary modules (Profile, AI Coach, Career Copilot, Goals, Workspaces, Resume ATS, Job Finder, Interview Coach, Roadmaps, Growth Lab, and Career Toolkit) rendered in a signed-in browser smoke check with no 4xx/5xx API responses observed.
- One generic Career Copilot request returned a response from the Hugging Face provider; the health endpoint then reported that provider as successful. This request used an external AI service and did not include personal student data.
- Backend startup also read 13 entries from the configured public Google Sheets job staging source into the isolated preview database. The preview is therefore local for account/database state, but not fully offline.

**Still required before production approval**

- Run the migration against a production-like copy and check for case-insensitive duplicate accounts before deploying.
- Deploy and verify the migration, API, and frontend together; the local hash-route refresh passed, but production direct-route behavior and complete student journeys remain to be verified.
- Verify all configured AI providers and failure behavior under production configuration. Local AI verification used the configured Hugging Face service and does not certify reliability or quality.
- Review and document all external data flows before inviting students to use the preview; do not enter sensitive personal information in this local test account.
- Decide and verify private, durable resume-file retention, access controls, and deletion; the current change discloses that the original file may not be retained.
- Complete broader module-by-module UX and data-persistence checks. A successful dashboard and account flow do not certify every tool or destination.

**Decision remains: not green for broad production launch.** Keep the phase gates above; this local result is suitable for stakeholder preview and further testing only.
