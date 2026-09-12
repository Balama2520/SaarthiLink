# Saarthi V1 Frontend Deep Audit

## 1. Executive Status
**BLOCKED**

Important workflows remain untested, AI configuration is pending, backend functionality requires live testing, and the resume workflow failed previous E2E verification.

## 2. Exact Metrics
* **Pages:** 19
* **Components:** 4
* **Buttons/actions:** 89 (counted exact instances of `onClick={` via script across `src/pages` and `src/components`)
* **Forms:** 7 (counted exact instances of `onSubmit={` via script across `src/pages` and `src/components`)
* **API wrappers:** 66 (counted `async [name](` declarations in `src/services/api.ts`)
* **Confirmed bugs:** 3 (identified by ESLint)
* **P0:** 0
* **P1:** 1 (Resume parser PDF extraction returned zero readable characters in prior E2E)
* **P2:** 3 (State update during render in AIWorkspaces and Goals; React refresh export violation in ToastContext)
* **P3:** 46 (`@typescript-eslint/no-explicit-any` warnings)
* **AI-blocked:** 5 (ChatStream, LearningRoadmap, InterviewEvaluate, SkillForgePipeline, CareerIntelligence)
* **Not tested:** All live browser/E2E interaction besides prior Resume test.

## 3. Exact Commands

### `npm run lint`
Result: Exit status 1
```text
C:\Users\91809\OneDrive\Desktop\Saarthi\frontend\src\context\ToastContext.tsx
  19:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\Users\91809\OneDrive\Desktop\Saarthi\frontend\src\pages\AIWorkspaces.tsx
  45:10  error  Error: Calling setState synchronously within an effect can trigger cascading renders

C:\Users\91809\OneDrive\Desktop\Saarthi\frontend\src\pages\Goals.tsx
   53:5   error    Error: Calling setState synchronously within an effect can trigger cascading renders

✖ 49 problems (3 errors, 46 warnings)
  0 errors and 3 warnings potentially fixable with the `--fix` option.
```

### `npm run build`
Result: Exit status 0
```text
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.0.16 building client environment for production...
transforming...✓ 2806 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                                0.47 kB │ gzip:   0.30 kB
dist/assets/geist-cyrillic-ext-wght-normal-DjL33-gN.woff2      7.42 kB
dist/assets/geist-vietnamese-wght-normal-6IgcOCM7.woff2        8.00 kB
dist/assets/geist-cyrillic-wght-normal-BEAKL7Jp.woff2         15.08 kB
dist/assets/geist-latin-ext-wght-normal-DC-KSUi6.woff2        16.51 kB
dist/assets/geist-latin-wght-normal-BgDaEnEv.woff2            29.40 kB
dist/assets/index-Bio5jb_u.css                               142.58 kB │ gzip:  19.48 kB
dist/assets/index-C9Wdt4nO.js                              1,016.86 kB │ gzip: 285.84 kB

✓ built in 2.89s
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 1000 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

## 4. Page Count & Audit

| Page | Rendering | Navigation | State | API | Loading | Error | Empty | Buttons | Forms | Responsive | Runtime | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AIWorkspaces.tsx | STATIC VERIFIED | STATIC VERIFIED | PASS WITH WARNINGS | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| AdminPanel.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| AdmissionsHub.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| AuthPage.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| CareerIntelligenceDashboard.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | AI-BLOCKED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED |
| ChatCoach.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | AI-BLOCKED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED |
| Dashboard.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| ExperimentStudio.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Goals.tsx | STATIC VERIFIED | STATIC VERIFIED | PASS WITH WARNINGS | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| GraduateHub.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| InterviewCoach.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | AI-BLOCKED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED |
| JobFinder.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| LearningRoadmaps.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | AI-BLOCKED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED |
| Notes.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| PersonaSelector.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Profile.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| ResearchAssistant.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| ResearchHub.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | BACKEND-DEPENDENT | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| SkillForge.tsx | STATIC VERIFIED | STATIC VERIFIED | STATIC VERIFIED | AI-BLOCKED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED |

## 5. Sidebar Audit

| Sidebar Item | Tab Key | App.tsx Render | Page | Persona visibility | Reachability | Status |
|---|---|---|---|---|---|---|
| Dashboard | `dashboard` | Yes | `<Dashboard />` | Core | STATIC VERIFIED | STATIC VERIFIED |
| Career Copilot | `copilot` | Yes | `<CareerIntelligenceDashboard />` | Core | STATIC VERIFIED | STATIC VERIFIED |
| My Profile | `profile` | Yes | `<Profile />` | Core | STATIC VERIFIED | STATIC VERIFIED |
| Goal Navigator | `goals` | Yes | `<Goals />` | Core | STATIC VERIFIED | STATIC VERIFIED |
| AI Workspaces | `workspaces` | Yes | `<AIWorkspaces />` | Core | STATIC VERIFIED | STATIC VERIFIED |
| AI OS Chat | `chat` | Yes | `<ChatCoach />` | Core | STATIC VERIFIED | STATIC VERIFIED |
| ATS Resume | `resume` | Yes | `<ResumeAnalyzer />` | Career Tools | STATIC VERIFIED | STATIC VERIFIED |
| Job Finder | `jobs` | Yes | `<JobFinder />` | Career Tools | STATIC VERIFIED | STATIC VERIFIED |
| Interview Coach | `interview` | Yes | `<InterviewCoach />` | Career Tools | STATIC VERIFIED | STATIC VERIFIED |
| Learning Roadmaps | `roadmaps` | Yes | `<LearningRoadmaps />` | Career Tools | STATIC VERIFIED | STATIC VERIFIED |
| Skill Forge | `skillforge` | Yes | `<SkillForge />` | Career Tools | STATIC VERIFIED | STATIC VERIFIED |
| Research Hub | `research` | Yes | `<ResearchHub />` | M.Tech, PhD | STATIC VERIFIED | STATIC VERIFIED |
| Experiment Studio | `experiments` | Yes | `<ExperimentStudio />` | M.Tech, PhD | STATIC VERIFIED | STATIC VERIFIED |
| Admissions Navigator| `admissions` | Yes | `<AdmissionsHub />` | MS Abroad | STATIC VERIFIED | STATIC VERIFIED |
| Grad Hub & Compass | `gradhub` | Yes | `<GraduateHub />` | M.Tech, PhD, MS Abroad, Undergrad | STATIC VERIFIED | STATIC VERIFIED |
| AI Study Notes | `notes` | Yes | `<Notes />` | System | STATIC VERIFIED | STATIC VERIFIED |
| System Admin | `admin` | Yes | `<AdminPanel />` | System | STATIC VERIFIED | STATIC VERIFIED |

## 6. API Audit
All 66 endpoints are technically defined in `api.ts`.
Classification: USED + NOT TESTED, except for AI routes which are BLOCKED, and Resume routes which are BROKEN based on prior E2E testing.

*Note: E2E Browser testing is required to verify the authentication header pass-through and response parsing handling for all non-blocked routes.*

## 7. E2E Audit

**Auth:**
- Static: PASS
- Browser: NOT TESTED
- Backend: NOT TESTED

**Profile:**
- Static: PASS
- Browser: NOT TESTED
- Backend: NOT TESTED

**Resume:**
- Static: PASS
- Browser: FAIL (Prior testing)
- Backend: BROKEN (PDF extraction returned zero readable characters)

**Jobs:**
- Static: PASS
- Browser: NOT TESTED
- Backend: NOT TESTED

**Goals:**
- Static: PASS WITH WARNINGS
- Browser: NOT TESTED
- Backend: NOT TESTED

**Chat:**
- Static: PASS
- Browser: BLOCKED
- Backend: AI-BLOCKED

**Copilot:**
- Static: PASS
- Browser: BLOCKED
- Backend: AI-BLOCKED

## 8. Critical Reality Check

1. **What is actually verified:** Automated `npm run build` succeeds.
2. **What is only statically verified:** The connection between `Sidebar.tsx`, `App.tsx`, and the 19 page components exists. The state store `useAppStore.ts` is configured cleanly for active tab tracking.
3. **What is blocked by backend:** All data fetching workflows (Jobs, Goals, Admin, Auth, Profile) are currently NOT TESTED in a live browser session.
4. **What is blocked by AI configuration:** `ChatCoach.tsx`, `CareerIntelligenceDashboard.tsx`, `LearningRoadmaps.tsx`, `SkillForge.tsx`, `InterviewCoach.tsx`.
5. **What was not tested:** Every button and form action on the frontend has not been manually triggered in a browser connected to a live backend.
6. **What remains broken:** 3 linting errors regarding strict rendering effects/exports. The Resume workflow is fundamentally BROKEN due to a previous HTTP 400 failure from the backend on document extraction.
