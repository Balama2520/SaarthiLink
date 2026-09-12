# Changelog

## Visual identity overhaul — 2026-08-24

The app read as templated AI-generated output: near-black/indigo/purple
glassmorphism theme (`#06060c` bg, `#6366F1` primary — a default that shows
up across most AI page-builders regardless of what the product actually is),
a login screen with a completely different gold-aurora color scheme
disconnected from the rest of the app, decorative rainbow accent colors
(cyan/purple/blue) scattered per-page with no relationship to their meaning,
and fake animated stat counters as filler content.

Replaced with a palette actually grounded in the product: **Saarthilink**
comes from *sāarthi* (सारथी) — "the charioteer who guides you," as Krishna
guides Arjuna — for a product whose whole premise is guiding someone through
resume, interview, and job-search decisions.

- **New token system** (`src/index.css`): warm near-black ink (`#0E0D0B`,
  not blue-black), parchment foreground, saffron/marigold primary (`#E9A23B`
  — deliberately distinct from Claude's own terracotta accent, and
  culturally specific: marigold garlands mark achievement across India),
  deep teal for growth/progress, solid hairline-bordered surfaces instead of
  blurred glassmorphism.
- **New type system:** Fraunces (serif, used only for headings, with
  restraint) paired with Inter for everything else — replaces an unused
  `@fontsource/montserrat` dependency that was declared but never imported
  anywhere.
- **Signature element:** a "journey rail" — Assess → Prepare → Apply →
  Arrive — used on the auth screen. This is the actual sequence a user
  moves through the product, not a decorative numbered list.
- **Rebuilt `AuthPage.tsx` from scratch:** dropped the gold-aurora theme
  (totally disconnected from the rest of the app), the animated stat
  counters (`50,000+ Students`, `95% Placement Rate` — invented placeholder
  numbers), the generic 6-icon feature grid, and a dead `saarthi_demo_mode`
  flag that was written to `localStorage` but never read anywhere. Replaced
  with a plain two-panel layout using the same design tokens as the rest of
  the app, so the first thing a user sees now matches the product they land
  in.
- **Fixed a real bug, not just a style issue:** `Goals.tsx`'s stat cards
  built Tailwind class names dynamically (`` `bg-${stat.color}-500/10` ``).
  Tailwind can't detect class names assembled from template literals like
  that — this means those icon backgrounds were **silently never rendering
  in the production build**, dev-only invisible breakage. Rewritten with
  static literal classes.
- **Fixed real contrast bugs:** several buttons/badges used `bg-primary` +
  `text-white`. That combination was fine when primary was a dark indigo,
  but fails WCAG contrast against the new light saffron primary. Every one
  of these (Sidebar logo, JobFinder/Goals/ResumeAnalyzer CTA buttons) now
  uses `text-primary-foreground`, which is computed for correct contrast
  against whatever `--primary` is set to.
- **Removed two-tone gradient CTA buttons** (`from-primary to-accent`) in
  favor of solid primary buttons — gradient buttons are themselves a common
  "AI-generated app" tell, and the two-tone gradient made text contrast
  inherently inconsistent across the button (fine on one end, poor on the
  other).
- Swept ~130 individual hardcoded Tailwind color utility classes
  (`indigo-`, `purple-`, `pink-`, `blue-`, `cyan-`, `slate-`, `gray-`, plain
  `text-white`/`bg-white`/`border-white`) across every page and component,
  replacing them with the semantic design tokens (`primary`, `accent`,
  `success`, `destructive`, `muted-foreground`, `border`) so the whole app
  now pulls from one consistent palette instead of each page inventing its
  own accent colors.
- Retitled a few pages/labels that read as generic tech-jargon copy
  ("SAARTHILINK OS", "Resume Intelligence Pipeline") to plainer, more
  confident product language ("Saarthilink", "Resume Analyzer").

`tsc -b --noEmit`, `eslint .`, and `vite build` all pass clean after this
pass (the production build itself was previously failing to run at all in
this environment due to a missing optional native binding — confirmed
working now with the reinstalled `node_modules`).

## Frontend hardening pass — 2026-08-23

Full audit + fix pass to bring the frontend from "working prototype" to
production-ready. `tsc -b --noEmit` and `eslint .` both pass clean with zero
errors/warnings after these changes.

### Fixed

- **Auth persistence bug:** "Keep me signed in" on the login screen previously
  had no effect — the token was always written to `localStorage` regardless of
  the checkbox, because every consumer in the app (`api.ts`, `useAppStore.ts`,
  `Profile.tsx`, `LearningRoadmaps.tsx`) independently read `localStorage`
  directly instead of going through one place. Fixed by introducing
  `src/lib/auth.ts` as the single source of truth for token storage, with real
  `local` vs `session` persistence support, and rewiring every consumer to it.
- **React hooks lint violation** in `useStreamingText.ts` — a `setState` call
  was firing synchronously inside a `useEffect` body on every render,
  triggering cascading renders. Rewritten using React's documented
  "adjust state during render" pattern.
- **`alert()` replaced with the app's toast system** in `InterviewCoach.tsx`
  for the "voice recognition not supported" case, for UX consistency with the
  rest of the app.
- **Resume upload now actually validates files client-side** (type + 10MB
  size cap) before hitting the network — previously the accepted-file
  filter existed only as an `accept=".pdf,.docx,.txt"` hint with no real
  enforcement.

### Removed (dead / risky code)

- `src/services/pdfWorker.ts` — an unused Web Worker whose "extraction" logic
  was a hardcoded placeholder string (`"Simulated extracted text content
  from " + file.name`) behind an artificial 800ms delay. Nothing imported it;
  if it had been wired up later it would have silently faked resume parsing.
- `src/services/api/careerCopilot.ts` — unused, and buggy (sent a literal
  `Authorization: Bearer null` header when logged out).
- Duplicate `cn()` helper redefinitions in `components/ui/Badge.tsx` and
  `Card.tsx` — now import the shared one from `lib/utils.ts`.
- One-off dev/debug scripts committed to the repo root
  (`scripts/update_authpage.py`, `scripts/refine_authpage.py`,
  `scripts/update_colors.py`, `audit_script.js`, `audit_script.cjs`,
  `count_script.cjs`) — these were migration/audit helpers for prior AI-assisted
  edits, not part of the shipped product.
- Stale committed `dist/` build output (already `.gitignore`d — shouldn't have
  been in the archive).

### Repo hygiene

- Normalized all `src/**/*.ts(x)` files from mixed CRLF/LF to LF.
- Replaced the default Vite scaffold `README.md` with real project docs.

### Known follow-ups (not yet done — flagged for the team)

- **Token storage model:** the app currently keeps the JWT in `localStorage`/
  `sessionStorage`, which is readable by any script that gets injected via
  XSS. For a real production launch, moving to an httpOnly-cookie + refresh-
  token flow (with the backend team) is the safer long-term default.
- **`api.ts` is a large (800+ line) hand-rolled fetch wrapper** with repeated
  try/throw boilerplate per endpoint, while `axios` sits in `package.json`
  unused. Worth consolidating into a single `request()` helper or actually
  adopting axios interceptors — this also gives you one place to handle
  401s globally (redirect to login) instead of each call site throwing a
  generic `Error`.
- **Landing-page stats** in `AuthPage.tsx` (`50,000+ Students`, `95% Placement
  Rate`, `12,000+ Mock Sessions`) are hardcoded placeholder marketing copy.
  This is a product/legal decision, not a code bug — flagging so the team
  replaces them with real numbers (or clearly-labeled projections) before
  public launch.
- Production build in this environment failed due to a missing optional
  native binding (`@rolldown/binding-linux-x64-gnu`) inside the extracted
  `node_modules` — this is a packaging artifact of how the zip was created,
  not a code issue. Run a clean `npm install` before building/deploying.
