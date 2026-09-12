import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuth as persistAuth, clearAuth, isAuthenticated as hasStoredToken, getRefreshToken, type AuthPersistence } from '../lib/auth';
import { api } from '../services/api';

export type PersonaType = 'undergrad' | 'mtech' | 'phd' | 'ms_abroad' | 'professional' | null;

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  username: string;
  setAuth: (username: string, token: string, refreshToken?: string | null, persistence?: AuthPersistence) => void;
  enterGuestMode: () => void;
  logout: () => void;

  // Navigation state
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Persona state
  persona: PersonaType;
  setPersona: (persona: PersonaType) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth state
      // Keep persisted state aligned with the token used by the API client
      // (src/lib/auth.ts). This also prevents a stale Zustand snapshot from
      // rendering a logged-in shell after storage has been cleared.
      isAuthenticated: hasStoredToken(),
      username: 'Guest User',
      setAuth: (username, token, refreshToken, persistence = 'local') => {
        persistAuth(username, token, refreshToken, persistence);
        set({ isAuthenticated: true, username });
      },
      enterGuestMode: () => {
        clearAuth();
        set({ isAuthenticated: false, username: 'Guest User' });
      },
      logout: () => {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          api.logout(refreshToken).catch(() => {});
        }
        clearAuth();
        set({ isAuthenticated: false, username: 'Guest User', activeTab: 'dashboard' });
      },

      // Navigation state
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Persona state
      persona: null,
      setPersona: (persona) => set({ persona }),
    }),
    {
      name: 'saarthi-storage',
      partialize: (state) => ({
        username: state.username,
        isAuthenticated: state.isAuthenticated,
        persona: state.persona,
      }), // only persist these fields
    }
  )
);
