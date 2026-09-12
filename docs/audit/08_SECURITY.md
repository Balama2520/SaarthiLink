# Security Audit Report

## Overview
Security posture for Saarthi V1 covers: JWT authentication, password hashing, secret management, CORS, input validation, and rate limiting.

---

## Findings

### 1. SECRET_KEY Validation — CRITICAL in Production (GOOD)
- **Location**: `app/core/config.py` lines 37–62
- **Observation**: The `validate_secret_key` validator raises a `ValueError` if the `SECRET_KEY` is the insecure development default and `DEBUG=False`. This is an excellent security control.
- **Status**: Positive finding. The protection is correct.

### 2. JWT Token Expiry — 7 Days (MEDIUM RISK)
- **Location**: `app/core/config.py` line 27
- **Observation**: `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7` — tokens expire after **1 week**.
- **Impact**: If a token is stolen, the attacker has a 7-day window. There is no token revocation (no blacklist/blocklist).
- **Recommendation**: Reduce to 24 hours for access tokens. Implement a refresh token flow for long-lived sessions.

### 3. CORS — Wildcard Origin (HIGH RISK)
- **Location**: `app/core/config.py` line 30
- **Observation**: `ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")` — defaults to wildcard CORS.
- **Impact**: In production, any origin can make cross-origin requests to the API, enabling CSRF-like attacks.
- **Recommendation**: Set `ALLOWED_ORIGINS` to the specific frontend domain (e.g., `https://saarthi.app`) in the production environment.

### 4. Password Length Truncation (LOW RISK)
- **Location**: `app/services/auth_service.py` lines 25–26
- **Observation**: Passwords longer than 72 bytes are silently truncated before hashing. bcrypt has a known 72-byte limit.
- **Impact**: Users who set passwords over 72 bytes could have two different passwords that produce the same hash (all characters after byte 72 are ignored).
- **Recommendation**: Either document this behavior clearly or pre-hash the password with SHA-256 before passing to bcrypt (common pattern to handle bcrypt's limit while preserving entropy).

### 5. Rate Limiting — Disabled by Default (HIGH RISK)
- **Location**: `app/core/config.py` line 33
- **Observation**: `RATE_LIMIT_ENABLED: bool` defaults to `false`. AI-heavy endpoints are completely unprotected.
- **Impact**: Bots or abusive users can flood the system, causing high LLM API costs and potential DoS.
- **Recommendation**: Enable rate limiting by default. Set `RATE_LIMIT_ENABLED=true` in `.env.example`.

### 6. Prompt Injection via User Data (HIGH RISK)
- **Cross-reference**: See `05_AI.md` Finding #6.
- **Summary**: User-controlled text fields are interpolated directly into LLM system prompts.

### 7. File Upload — No File Type Validation Backend (HIGH RISK)
- **Observation**: File uploads (resumes) likely rely on the frontend's `accept` attribute to restrict file types (`.pdf`, `.docx`, `.txt`). This is client-side only and trivially bypassed.
- **Recommendation**: Validate the file's MIME type on the backend using `python-magic` or equivalent before processing.

### 8. No `httponly` / `Secure` Flags on Token (MEDIUM RISK)
- **Observation**: The JWT is stored in `localStorage` on the frontend, which is vulnerable to XSS.
- **Recommendation**: For a V1 production hardening, continue with `localStorage` but ensure all user-input-rendered content is properly sanitized (no `dangerouslySetInnerHTML` usage). Future: migrate to `httpOnly` cookie-based tokens.

## CTO Recommendations
1. **[HIGH]** Set `ALLOWED_ORIGINS` to specific domain in `.env.example`.
2. **[HIGH]** Enable rate limiting by default.
3. **[HIGH]** Add backend MIME type validation for file uploads.
4. **[MEDIUM]** Reduce JWT expiry to 24 hours.
5. **[LOW]** Document the 72-byte bcrypt password truncation behavior.
