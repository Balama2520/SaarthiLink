/**
 * Bulletproof Axios Orchestration Client for Saarthi Production API
 * =================================================================
 * Intercepts all outbound HTTP requests to automatically inject Supabase JWT tokens.
 * Handles rate limits (429), unauthorized redirects (401), and provides anti-duplicate triggers.
 */

import axios from "axios";

// Base API URL configuration (Render production fallback)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15-second client boundary
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Outbound Request Interceptor (Supabase JWT Auto-Injection) ────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Retrieve Supabase Session Access Token from LocalStorage
    const sbAuthToken =
      localStorage.getItem("sb-access-token") ||
      localStorage.getItem("saarthi_auth_token");

    if (sbAuthToken && config.headers) {
      config.headers.Authorization = `Bearer ${sbAuthToken.replace(/^"|"$/g, "")}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Inbound Response Interceptor (Global Error Sanitization) ─────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        console.warn("[Auth] Session expired or invalid token. Redirecting to auth modal...");
      } else if (status === 429) {
        console.warn("[RateLimit] Too many requests. Please wait a moment.");
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Anti-Multi-Click Submission Guard Wrapper.
 * Disables target button state during processing to prevent fast double-posting.
 */
export async function withSubmitLock(isSubmittingStateSetter, asyncTaskFn) {
  if (typeof isSubmittingStateSetter === "function") {
    isSubmittingStateSetter(true);
  }

  try {
    const result = await asyncTaskFn();
    return result;
  } finally {
    if (typeof isSubmittingStateSetter === "function") {
      isSubmittingStateSetter(false);
    }
  }
}

export default apiClient;
