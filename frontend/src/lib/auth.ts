// Single source of truth for auth-token storage.
//
// Previously, token read/write logic was duplicated across useAppStore.ts,
// services/api.ts, services/api/careerCopilot.ts, AuthPage.tsx, Profile.tsx
// and LearningRoadmaps.tsx — each independently touching localStorage. That
// drift is what caused "Keep me signed in" to silently do nothing: unchecking
// it wrote to sessionStorage, but every consumer only ever checked
// localStorage. All reads/writes now go through this module.

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USERNAME_KEY = "username";

export type AuthPersistence = "local" | "session";
export const AUTH_EXPIRED_EVENT = "saarthi:auth-expired";

function storageFor(persistence: AuthPersistence): Storage {
  return persistence === "session" ? sessionStorage : localStorage;
}

/** Returns the active token, checking session storage first, then local storage. */
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function getStoredUsername(): string | null {
  return sessionStorage.getItem(USERNAME_KEY) ?? localStorage.getItem(USERNAME_KEY);
}

/** Returns where the active credentials live, or null for a guest. */
export function getAuthPersistence(): AuthPersistence | null {
  if (sessionStorage.getItem(TOKEN_KEY)) return "session";
  if (localStorage.getItem(TOKEN_KEY)) return "local";
  return null;
}

/**
 * Persist a freshly-issued token.
 * @param persistence "local" keeps the user signed in across browser restarts;
 *   "session" clears the token when the tab/browser closes.
 */
export function setAuth(username: string, token: string, refreshToken?: string | null, persistence: AuthPersistence = "local") {
  // Always clear both stores first so a stale token never lingers in the
  // other storage after switching persistence modes.
  clearAuth();
  const store = storageFor(persistence);
  store.setItem(TOKEN_KEY, token);
  store.setItem(USERNAME_KEY, username);
  if (refreshToken) {
    store.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USERNAME_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Auth header object, ready to spread into a fetch `headers` init. */
export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
