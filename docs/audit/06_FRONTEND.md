# Frontend Audit Report

## Overview
The frontend is built with React 18 + TypeScript + Vite. State management uses Zustand for auth and React Query for server state. Styling uses Tailwind CSS.

---

## Findings

### 1. Tab-Based Navigation — No Deep Linking (MEDIUM RISK)
- **Location**: `App.tsx`, `Dashboard.tsx`
- **Observation**: The main workspace uses `setActiveTab(tab: string)` passed as props. Navigation does not use React Router's `<Route>` paths for workspace sections.
- **Impact**: Users cannot bookmark or share specific pages (e.g., `/goals`, `/copilot`). Browser back/forward navigation does not work within the dashboard.
- **Recommendation**: Migrate workspace routing to React Router `<Route>` paths. This is a V1 polish item.

### 2. Guest Mode Detection — localStorage Dependency (MEDIUM RISK)
- **Location**: `ChatCoach.tsx` line 29
- **Observation**: `const isGuest = !localStorage.getItem("access_token")` — the guest/auth state is computed on every render by directly reading `localStorage` instead of relying on a centralized auth state store.
- **Impact**: If the token is cleared programmatically (e.g., on expiry), the component will not reactively update its `isGuest` state until re-rendered.
- **Recommendation**: Use the Zustand `useAppStore` to access `isAuthenticated` state reactively.

### 3. `window.prompt()` Usage (HIGH RISK)
- **Location**: `ChatCoach.tsx` lines 81–84
- **Observation**: `const name = window.prompt(...)` is used to collect the guest user's name.
- **Impact**: Native `window.prompt()` is completely unstyled, breaks the premium design aesthetic, is blocked in iframes, and creates a jarring UX break.
- **Recommendation**: Replace with an in-component modal or inline input for the name prompt.

### 4. Loading & Skeleton States (GOOD)
- **Location**: `Dashboard.tsx` — `Skeleton` component defined and used.
- **Observation**: The Dashboard correctly shows skeleton placeholders during data fetches.
- **Status**: Positive finding.

### 5. Error Boundaries — Missing (HIGH RISK)
- **Observation**: No React Error Boundary components were found in the codebase.
- **Impact**: An unhandled JavaScript error in any page component will crash the entire React tree, showing a blank white screen to the user with no recovery option.
- **Recommendation**: Wrap all page components in `<ErrorBoundary>` with a helpful fallback UI. Add a root-level `ErrorBoundary` in `App.tsx`.

### 6. SessionError Banner (GOOD)
- **Location**: `ChatCoach.tsx` lines 305–309
- **Observation**: A session error banner is correctly shown when the backend session creation fails.
- **Status**: Positive finding.

### 7. Accessibility — Missing ARIA Labels (LOW RISK)
- **Observation**: Icon-only buttons (File Upload, Mic, Send) use `title` attributes but are missing `aria-label` attributes for screen reader compatibility.
- **Recommendation**: Add `aria-label` to all interactive icon-only elements.

## CTO Recommendations
1. **[HIGH]** Add React Error Boundaries to all page components and the root.
2. **[HIGH]** Replace `window.prompt()` with an in-app modal or inline input.
3. **[MEDIUM]** Migrate to React Router URL-based navigation for deep-link support.
4. **[MEDIUM]** Use Zustand auth state instead of direct `localStorage` reads in components.
5. **[LOW]** Add `aria-label` to icon-only buttons.
