# 10 — Frontend Architecture

## Technology Stack

| Layer       | Technology        | Reason                                      |
|-------------|-------------------|---------------------------------------------|
| Framework   | React 19          | Concurrent rendering, hooks, Actions API    |
| Language    | TypeScript        | Type safety, refactor confidence            |
| Build       | Vite 8            | Sub-second HMR, ESM-native                  |
| Styling     | Tailwind v4       | Utility-first, zero runtime cost            |
| Components  | shadcn/ui         | Headless, composable, accessible            |
| State       | Zustand           | Lightweight, modular global state           |
| Server      | TanStack Query    | Cache-first data fetching, background refetch|
| Animation   | Framer Motion     | Declarative spring animations               |
| Icons       | Lucide React      | Tree-shakeable, consistent icon set         |

---

## Feature-First Folder Structure (Target)

```
frontend/src/
├── app/
│   ├── main.tsx             # Entry point
│   ├── App.tsx              # Router shell + providers
│   └── providers.tsx        # QueryClient, Zustand, etc.
│
├── components/              # SHARED UI ONLY — no feature logic here
│   └── ui/
│       ├── button.tsx       # shadcn/ui primitives
│       ├── input.tsx
│       ├── modal.tsx
│       ├── badge.tsx
│       └── ...
│
├── layouts/
│   ├── RootLayout.tsx       # Sidebar + main area shell
│   └── AuthLayout.tsx       # Clean auth page layout
│
├── hooks/                   # Shared custom hooks
│   ├── useAuth.ts
│   ├── useGoals.ts
│   └── useDebounce.ts
│
├── services/                # API gateway layer
│   ├── api.ts               # Base fetch wrapper
│   ├── goals.api.ts         # Goals endpoints
│   ├── chat.api.ts          # Chat endpoints
│   └── career.api.ts        # Career module endpoints
│
├── stores/                  # Zustand global state
│   ├── auth.store.ts        # Authentication state
│   ├── ui.store.ts          # Active tab, sidebar state
│   └── goals.store.ts       # Active goal context
│
└── features/                # Feature modules (one folder per domain)
    ├── home/
    │   ├── HomePage.tsx
    │   └── components/
    ├── goals/
    │   ├── GoalsPage.tsx
    │   ├── GoalDetail.tsx
    │   └── components/
    │       ├── GoalCard.tsx
    │       ├── MilestoneList.tsx
    │       └── AIPlannerPanel.tsx
    ├── chat/
    │   ├── ChatPage.tsx
    │   └── components/
    ├── workspace/
    │   ├── WorkspacePage.tsx
    │   └── components/
    ├── career/              # ALL career tools in ONE feature folder
    │   ├── GraduateHub.tsx
    │   ├── JobFinder.tsx
    │   ├── InterviewCoach.tsx
    │   ├── AdmissionsHub.tsx
    │   └── components/
    │       └── ResumeAnalyzer.tsx
    ├── research/
    │   ├── ResearchHub.tsx
    │   └── ExperimentStudio.tsx
    ├── learning/
    │   ├── LearningRoadmaps.tsx
    │   └── SkillForge.tsx
    └── settings/
        └── SettingsPage.tsx
```

---

## State Management Strategy

```
                 ┌─────────────────────────────┐
                 │   TanStack Query Cache       │
                 │  (Server state: API data)   │
                 └─────────────────────────────┘
                           +
                 ┌─────────────────────────────┐
                 │       Zustand Store          │
                 │  (Client state: UI, auth)   │
                 └─────────────────────────────┘
```

**Rule**: Never put server data in Zustand. Never put UI state in TanStack Query.

| State Type             | Tool           | Example                           |
|------------------------|----------------|-----------------------------------|
| Server data (goals)    | TanStack Query | `useQuery(['goals'], fetchGoals)` |
| Active tab             | Zustand        | `uiStore.activeTab`               |
| Auth token             | Zustand        | `authStore.token`                 |
| Form state             | useState       | `const [name, setName] = ...`     |

---

## Navigation Architecture

**Current**: `activeTab` string prop drilled from App.tsx  
**Target**: React Router v7 with typed routes

```
/                    → Home Dashboard
/goals               → Goal Navigator
/goals/:id           → Goal Detail + Milestones
/chat                → AI OS Chat
/workspace           → AI Workspaces
/career              → Career Hub (landing)
/career/resume       → Resume Analyzer
/career/jobs         → Job Finder
/career/interview    → Interview Coach
/career/admissions   → Admissions Hub
/research            → Research Hub
/learning            → Learning Roadmaps
/settings            → Settings
```

---

## Component Rules

1. **Never duplicate components** — if it exists, reuse it.
2. Components in `components/ui/` are **presentational only** — no API calls.
3. Feature components handle their own data fetching via TanStack Query.
4. Layouts receive children only — no feature logic.
5. Hooks are the **only** way to share stateful logic between components.

---

## Current State Assessment

| File                        | Status     | Action                              |
|-----------------------------|------------|-------------------------------------|
| `App.tsx`                   | REFACTOR   | Replace prop drilling with Router   |
| `components/Sidebar.tsx`    | REFACTOR   | Extract nav items to config array   |
| `components/ErrorBoundary`  | KEEP       | Works correctly                     |
| `components/ui/button.tsx`  | KEEP       | Reuse and extend                    |
| `pages/Dashboard.tsx`       | REFACTOR   | Goals-centric, live data            |
| `pages/Goals.tsx`           | KEEP       | New, clean implementation           |
| `pages/AuthPage.tsx`        | KEEP       | Works well, good UX                 |
| `pages/ChatCoach.tsx`       | MOVE       | → `features/chat/`                  |
| `pages/GraduateHub.tsx`     | MOVE       | → `features/career/`                |
| `pages/JobFinder.tsx`       | MOVE       | → `features/career/`                |
| `pages/InterviewCoach.tsx`  | MOVE       | → `features/career/`                |
| `pages/ResearchHub.tsx`     | MOVE       | → `features/research/`              |
| `pages/SkillForge.tsx`      | MOVE       | → `features/learning/`              |
| `pages/PersonaSelector.tsx` | DELETE     | Replaced by Goal onboarding         |
| `context/PersonaContext.tsx`| REFACTOR   | Replace with Zustand auth.store     |
| `services/api.ts`           | REFACTOR   | Split by feature domain             |
| `services/localDB.ts`       | KEEP       | IndexedDB for offline caching       |
