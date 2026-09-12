# 21 — Cost Optimization

## Philosophy
As a personal AI OS, Saarthi must be extremely cheap to operate per user, ideally approaching zero marginal cost when running locally. Cloud deployment should cost pennies per active user per month.

## 1. Provider Tiering (The Waterfall Model)
All AI requests fall through a waterfall based on the task difficulty:

1. **Local First (Ollama)**
   - **Cost**: $0
   - **Models**: `phi3` (fast, logic), `llama3.1-8b` (complex planning), `llava` (vision).
   - **Use case**: 90% of daily tasks (routing, summarizing, simple chat).

2. **Free API Tier (Gemini)**
   - **Cost**: $0 (up to 15 RPM).
   - **Models**: `gemini-1.5-flash`.
   - **Use case**: Fallback when Ollama is down, or for long-context PDF analysis where local RAM is insufficient.

3. **Premium API Tier (OpenAI / Anthropic)**
   - **Cost**: High.
   - **Models**: `gpt-4o`, `claude-3.5-sonnet`.
   - **Use case**: Only used if the user explicitly selects it in settings AND provides their own API key (BYOK).

## 2. Token Reduction Strategies
- **Aggressive Summarization**: Old messages in a chat session are automatically summarized and replaced in the context window.
- **RAG Pre-filtering**: Instead of dumping a whole PDF into context, use ChromaDB to extract only the top 3 most relevant chunks before sending to the LLM.
- **System Prompt Caching**: The core system prompt rarely changes during a session. We will implement prompt caching (available in newer API standards) to avoid paying for the same prefix tokens repeatedly.

## 3. Infrastructure Optimization
- **Database**: PostgreSQL (Neon or Supabase free tier for MVP, standard RDS for scale).
- **Vector DB**: ChromaDB runs embedded in the FastAPI process for MVP (0 infra cost). Qdrant Cloud free tier for production.
- **Compute**: FastAPI deployed on a single VPS (e.g., Hetzner or DigitalOcean $6/mo instance) is sufficient for thousands of users due to Python `asyncio`.
- **Frontend**: Vite SPA deployed to Vercel or Cloudflare Pages (Free tier).

## 4. Analytics
- **Token Tracking**: The AI Gateway must log `prompt_tokens` and `completion_tokens` to the database for every single request, tagged by `user_id` and `model`.
- **Cost Dashboard**: Admin dashboard must show a real-time burn rate.
