# Nexvia Student Internship Portal — Read-Only CTO Review

**Review date:** October 24, 2026  
**Scope:** Read-only review of the signed-in student experience, with account-owner permission  
**Systems reviewed:** `www.nexviatechnologies.in` student portal and browser-visible requests to `nexvia-platform.onrender.com`  
**Changes made:** None. No form submissions, lesson completion, quiz attempts, uploads, project hand-ins, account edits, or sign-out actions were performed during this review.

> This report documents observable behavior, not a source-code, penetration-test, infrastructure, or database audit. The reviewer did not have application source code, provider credentials, database access, server logs, or a separate test tenant. “Observed” means visible in the browser or in normal requests initiated as the reviewed pages loaded.

## 1. Executive summary

Nexvia’s portal presents a coherent internship workflow:

**Dashboard → Internship overview → Learning modules and lessons → Capstone projects → Final project hand-in → Evaluation/certificate**

The experience appears to be a real web application backed by a separately hosted API. When portal pages loaded, the browser requested account, program, project, and learning information from a Render-hosted API. The portal personalizes the dashboard and course views with account-level progress and assigned projects.

The principal operational concern found is **progress consistency**: the same active module showed different lesson totals/completion states across the dashboard, internship page, learning list, and lesson detail. Some variation may be due to different definitions, but the interface does not explain them. A student could reasonably interpret the figures as contradictory.

The highest-impact workflow concern is project hand-in: one Google Drive folder URL is submitted once for two projects, the folder must be shared broadly, and the UI says the submission cannot be changed afterward. This creates privacy, access-control, and mistake-recovery risks.

**Overall judgment:** the student workflow is understandable and the read-only pages rendered, but correctness of writes, assessment grading, reviewer verification, certificate issuance, AI features, and durable database behavior remain unverified. This is not a production-readiness certification.

## 2. Review boundaries and privacy

- The browser already had an authenticated session. No username or password was entered for this review.
- The account owner confirmed permission for read-only inspection.
- I navigated through dashboard, internship, learning, lesson, project, and profile pages.
- I opened project instructions for reading but did not submit the Google Drive form.
- I did not press controls that could start a quiz, mark a lesson complete, submit work, upload a document, edit profile data, or change account state.
- Personal identity, email address, and student identifier appeared in the portal. They are intentionally omitted from this report.
- The browser session was left unchanged; I did not sign out or alter stored data.

## 3. Portal structure observed

### 3.1 Navigation

The signed-in portal exposes:

- Dashboard
- My Internship
- Learning
- Projects
- Profile
- Progress — shown as “Soon”
- Feedback — shown as “Soon”
- Certificate — shown as “Soon”
- Support — shown as “Soon”

The “Soon” entries are not functioning destinations in the observed navigation. This should be presented to students as planned functionality, not as an available feature.

### 3.2 Dashboard

The dashboard provides a welcome view, program/specialization/date summary, a featured learning module, overall progress, lesson/module counts, assigned-project count, and a learning-path list.

Observed values were account-specific and included:

- An active Full-Stack Development internship.
- Five curriculum modules.
- Two assigned projects.
- Overall progress of 15%.
- A global completed-lesson count of 5 out of 34.
- A featured-module card displaying “62% complete (0 of 7 lessons).”

Personal details have been omitted. The account-specific program/progress values above are included only to illustrate the inconsistency described below.

### 3.3 Internship overview

The internship page summarizes program status, duration, start/end dates, specialization, five modules, assigned-project approvals, and certificate requirements.

The page showed:

- 0 of 5 modules completed.
- 0 of 2 assigned projects approved.
- 15% overall progress.
- Certificate eligibility described as depending on completing modules, projects, and a final evaluation.

The conditions shown imply that module completion and project approval are inputs to certification. I could not verify the actual certificate issuing rules or whether they are enforced by the backend.

### 3.4 Learning catalog and lesson detail

The learning page describes a one-month foundation curriculum covering:

- HTML/CSS and responsive web foundations
- JavaScript and DOM
- Backend development and databases
- Frontend/backend integration
- A capstone project

The module/lesson UI provides theory, code, exercises, pitfalls, learning objectives, and a module quiz. The opened lesson page showed a curriculum and lesson navigation. I read the content but did not start the quiz or change completion state.

The lesson-detail screen showed “5 of 8 Completed (63% Mastered)” and a seven-lesson list plus a module quiz. It included a clear percentage based on 5/8, but the dashboard’s “0 of 7 lessons” for the featured module does not match this view without an explanation of the different denominator/state.

### 3.5 Projects and final submission

The Projects page displayed two assigned full-stack capstones:

1. A multi-vendor e-commerce marketplace.
2. A real-time collaborative workspace.

Each project includes a specialization track, start/deadline dates, estimated effort, and a “View Instructions & Resources” control. The instructions include suggested implementation steps, required stack, deliverables, and optional reference datasets.

The combined submission flow requires a single Google Drive folder link for both projects. The instructions say to:

- Organize both projects in subfolders.
- Make the folder link broadly accessible to reviewers.
- Submit the URL once.
- Treat the submission as locked and not resubmittable.

I inspected the form and guidance only. I did not provide a URL or submit it.

### 3.6 Profile

The profile page displayed account identity and internship information as read-only text. No edit controls were visible on that page during review. I do not know whether profile changes are available elsewhere.

## 4. Data and backend evidence

### What the browser revealed

While the signed-in pages loaded, normal browser resource records included requests to:

- `GET /api/auth/me`
- `GET /api/student/program`
- `GET /api/student/projects`
- `GET /api/learning/progress`
- `GET /api/learning/path`

The API host was `nexvia-platform.onrender.com`. This supports the conclusion that the portal separates its frontend origin from a backend API and loads account/program/project/learning data dynamically.

### What this does not prove

This observation does **not** establish:

- The database product or schema.
- Whether data is relational, document-based, or partly held in another service.
- Whether the API writes are transactional or idempotent.
- How authentication tokens/cookies are validated or refreshed.
- Whether every endpoint checks account ownership correctly.
- Whether progress is computed in the backend or frontend.
- Whether production backups, retention, deletion, and restore procedures exist.
- Whether reviewers can see only the intended submitted files.

I did not inspect raw responses for unnecessary personal data, call undocumented endpoints, probe infrastructure, or attempt to access other users’ records.

## 5. AI assessment

The reviewed student portal screens primarily presented a curriculum, static instructions, progress indicators, and project hand-in. I did not see an AI interaction in the dashboard/learning/project workflow that could be safely tested without sending a prompt or changing account state.

Therefore:

- No AI provider/model can be confirmed from this review.
- No AI-generated answer, rubric, or code feedback was validated.
- The “AI Engineering” company branding or project guidance should not be treated as proof that the student portal currently uses an AI model.
- Backend AI integration, latency, cost controls, prompt/data handling, and output evaluation remain unknown.

If the product offers an AI feature elsewhere, it requires a dedicated test plan and explicit approval to submit test prompts. Use synthetic, non-personal input.

## 6. Findings and recommendations

| Priority | Finding | Impact | Recommendation |
|---|---|---|---|
| **High** | Progress figures are not self-consistent across screens: the dashboard showed 0/7 lessons for the featured module; the lesson detail showed 5/8 completed; the overall dashboard showed 5/34 lessons and 15%; internship showed 0/5 modules complete and 15%. | Students and reviewers may not know which figure represents actual completion, and progress may be misreported. | Define one progress model and its denominator. Make dashboard, course, lesson, and internship pages use the same server-derived state. Label separate measures explicitly (viewed, completed, mastered, quiz passed). |
| **High** | A single Google Drive URL is a one-time, locked hand-in for two projects, and the instructions request broad link sharing. | A wrong URL, missing permission, or accidental disclosure is hard to fix; public-link access may expose student work. | Use private portal uploads or a restricted reviewer share. Check access before accepting, allow a correction/revision window, record submission history, and explain retention/deletion. |
| **High** | Project review/approval semantics are unclear from the student view. The UI reports assigned and approved counts, but the reviewer process and feedback loop were not visible. | Students may not know what constitutes acceptance, who reviews work, when feedback arrives, or how to resubmit. | Publish an evaluation rubric, reviewer status timeline, feedback channel, resubmission rules, and an audit record of reviewer decisions. |
| **Medium** | Progress, Feedback, Certificate, and Support are marked “Soon.” | Navigation can imply these are available when they are not. Certificate is also described as an outcome elsewhere. | Hide unavailable destinations or label them “Coming soon” with a target date; document certificate delivery and support contacts. |
| **Medium** | The profile view appears read-only with no visible edit path. | Incorrect identity/contact/program information may be difficult to correct. | Add a clearly discoverable edit/request-correction path and explain which fields are controlled by the program administrator. |
| **Medium** | The curriculum page exposes a quiz control, but assessment rules, grading, retries, and how quiz results affect progress/certification are not explained in the reviewed screens. | Users cannot predict the impact of assessment attempts; reviewers cannot see a transparent grading policy. | Document attempt limits, scoring, pass thresholds, feedback, retry policy, and whether quiz completion contributes to “mastered” status. |
| **Medium** | The company’s public branding mentions AI, but AI behavior was not evidenced in the inspected portal workflow. | Students may infer AI evaluation or mentoring is active when its availability and role are unclear. | Identify which student-facing features actually use AI, what data is sent, how results are reviewed, and what happens when AI is unavailable. |
| **Medium** | The account-specific page includes personal identity and internship identifiers. | Screenshots, shared devices, and public-link submissions can leak personal information. | Minimize PII on shared/student views, support secure sign-out/session expiry, and warn before sharing external folders. |
| **Low** | “Duration” was rendered with inconsistent singular/plural wording between pages (“1 Month” and “1 Months”). | Small polish issue that reduces trust and signals duplicated formatting logic. | Use a shared duration formatter. |

## 7. Recommended acceptance checks for a real end-to-end test

These checks were **not performed**. They are the next safe verification plan for a dedicated test tenant/account:

1. **Authentication:** verify login, invalid credentials, session expiry/refresh, sign-out, and password recovery using a test mailbox.
2. **Account boundaries:** with two test students, verify each can read only their own profile, progress, projects, and submissions.
3. **Progress source of truth:** identify the backend values used by dashboard, course, lesson, quiz, project, and internship summaries; verify all screens agree before and after an approved test completion.
4. **Learning completion:** on a disposable course, test lesson start/complete, quiz attempt, pass/fail feedback, retry behavior, duplicate requests, and page refresh persistence.
5. **Project workflow:** submit a synthetic test folder using restricted reviewer access; verify validation, confirmation, reviewer status, feedback, resubmission, and audit history. Do not use a real private student folder.
6. **Certificate rules:** test eligibility with controlled test data and verify issued certificates are reproducible, attributable, and revocable/correctable if issued in error.
7. **Backend and database:** with operator authorization, review API logs, schema/migrations, foreign keys, transaction boundaries, backups, and restore evidence. Browser inspection cannot prove these.
8. **AI (only if present):** submit synthetic prompts; verify provider identity, citations/evidence where relevant, unsafe or incorrect response handling, failure status, and data-retention policy.
9. **Accessibility/responsiveness:** test keyboard navigation, focus/labels, screen-reader structure, contrast, and mobile layout.
10. **Operations:** check deployed health, dependency failure behavior, rate limits, monitoring, alerting, and recovery playbooks.

## 8. Final CTO conclusion

The portal’s information architecture gives a student a visible path from internship onboarding through learning and capstone submission. The system appears API-backed and personalized, and the visible curriculum/project material is detailed enough to communicate expectations.

Before relying on the portal as an auditable internship-management system, prioritize:

1. **Unify progress state and definitions across all views.**
2. **Replace irreversible, broadly shared project hand-ins with a private, recoverable submission workflow.**
3. **Publish a transparent project/quiz review and certificate process.**
4. **Perform authorized two-account isolation and write-persistence tests in a test environment.**
5. **Clarify which AI features are actually live and how student data is handled.**

This was a **read-only UI and passive API-integration review**, not a full backend/database/AI audit. No production data was changed.
