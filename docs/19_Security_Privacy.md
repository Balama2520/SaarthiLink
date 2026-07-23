# 19 — Security & Privacy

## Core Philosophy
Saarthi AI deals with highly personal data: career ambitions, academic research, private thoughts, and resumes. **Privacy is the product.** 

## 1. Data Ownership
- **Export**: Users must be able to export all their data (Goals, Chat, Notes) in a portable format (JSON/Markdown) at any time.
- **Deletion**: When a user deletes their account, it must trigger a hard delete across all databases (PostgreSQL, Vector DB, Cloudflare R2). No soft-delete retention for accounts.

## 2. LLM Provider Privacy
- **Local First**: By default, Saarthi is designed to run against local models (Ollama). In this mode, zero data leaves the user's infrastructure.
- **Provider Contracts**: If external providers (OpenAI, Gemini) are used via the AI Gateway, we must strictly use API endpoints that opt-out of data training (e.g., OpenAI API vs ChatGPT).
- **Key Bring-Your-Own (BYOK)**: Power users can provide their own API keys in Settings. These keys must be encrypted at rest in the database.

## 3. Authentication & Authorization
- **JWT**: Standard short-lived access tokens and long-lived refresh tokens.
- **Row-Level Security (Conceptually)**: Every repository query MUST include `user_id`.
  - `SELECT * FROM goals WHERE id = X` ❌
  - `SELECT * FROM goals WHERE id = X AND user_id = Y` ✅
- **No IDOR**: UUIDs are used for all user-facing entities to prevent Insecure Direct Object Reference attacks.

## 4. API Security
- **Rate Limiting**: Applied via Redis on all endpoints. Stricter limits on AI generation routes (e.g., max 10 requests per minute per user).
- **CORS**: Strictly defined in `config.py`. Wildcard `*` only permitted in local dev.
- **Payload Limits**: File uploads (resumes/PDFs) capped at 10MB to prevent DOS.

## 5. Secret Management
- No secrets in frontend code.
- `.env` files are excluded via `.gitignore`.
- Production uses secure secret managers (e.g., AWS Secrets Manager, GitHub Secrets).
