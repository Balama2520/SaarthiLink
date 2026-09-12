# Saarthilink — Frontend

AI-powered career copilot for students and job-seekers: resume analysis, job matching, mock interviews, learning roadmaps, and progress tracking.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** for styling, **shadcn**-style primitives in `src/components/ui`
- **Zustand** (with `persist`) for global app state (`src/store/useAppStore.ts`)
- **TanStack Query** for server-state caching and mutations
- **Framer Motion** for animation

## Getting started

```bash
npm install
npm run dev       # start the dev server (proxies /api -> http://localhost:2520)
npm run build      # type-check + production build
npm run lint       # ESLint
```

## Project structure

```
src/
├── pages/          # Route-level screens (Dashboard, JobFinder, InterviewCoach, ...)
├── components/      # Reusable components; components/ui holds design-system primitives
├── hooks/           # Data-fetching and UI hooks (React Query wrappers, toast, etc.)
├── services/        # api.ts — the single fetch layer talking to the backend
├── store/           # Zustand global state (auth, active tab, persona)
├── lib/             # auth.ts (token storage), utils.ts (cn helper)
└── context/         # ToastContext (app-wide toast notifications)
```

## Auth

Token storage is centralized in `src/lib/auth.ts` — this is the **only** place that should
read or write `access_token` / `username` from browser storage. Every other module
(`services/api.ts`, `store/useAppStore.ts`, pages that need to check sign-in state) imports
from here. "Keep me signed in" (in `AuthPage.tsx`) controls whether the token lands in
`localStorage` (persists across restarts) or `sessionStorage` (cleared when the tab closes).

If you add a new page or service that needs to know whether the user is signed in, import
`isAuthenticated()` / `getToken()` / `authHeader()` from `lib/auth.ts` — do not read
`localStorage` directly.

## Notes for contributors

- Backend is expected at `/api` (see `vite.config.ts` dev proxy and `nginx.conf` for prod).
- File uploads (resume analyzer) are capped client-side at 10MB and restricted to
  `.pdf` / `.docx` / `.txt` — see `validateAndSetFile` in `ResumeAnalyzer.tsx`.
- See `CHANGELOG.md` for the most recent hardening pass and known follow-ups.
