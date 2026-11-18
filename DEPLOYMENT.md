# Saarthi AI OS Deployment Guide

This guide details the process for deploying Saarthi AI OS into production using Docker Compose.

## Prerequisites
- Docker & Docker Compose installed on the host machine.
- Minimum 2GB RAM.

## Initial Setup
1. Clone the repository to the production server.
2. Create an environment file:
   ```bash
   cp .env.example .env
   ```
3. **CRITICAL:** Update the `.env` file!
   - Change `SECRET_KEY` to a cryptographically secure random string.
   - Update `ALLOWED_ORIGINS` to include your production domain.
   - Set up API keys for your preferred LLM provider.

## Starting the Stack
The stack uses `docker-compose.yml` to orchestrate:
- **Backend**: FastAPI
- **Frontend**: React served via Nginx
- **Database**: PostgreSQL
- **Cache**: Redis

Start the entire application in detached mode:
```bash
docker-compose up -d --build
```

## Database Migrations
Migrations run automatically on backend container startup via Alembic (`alembic upgrade head`).

## Provisioning an administrator
Public registration always creates a standard user. Admin access is granted only
by an operator changing the persisted role from a trusted backend shell. After
creating the intended account and applying migrations, run this from the backend
directory:

```bash
python scripts/manage_user_role.py <username> admin
```

To revoke admin access, run the same command with `user`. Verify the account
through the authenticated `/api/auth/me` endpoint. Do not grant admin access by
choosing a special username or adding an account to a public-registration
allowlist.

## Monitoring & Operations
- **Metrics**: Prometheus metrics are available at `/metrics` on the backend API.
- **Logs**: Logs are JSON-formatted for ingestion into Logstash or Datadog. Check logs via:
  ```bash
  docker-compose logs -f backend
  ```

## Security Best Practices
- **Rate Limiting**: Enabled by default (`100/minute`).
- **Security Headers**: HSTS, CORS, and Anti-XSS are enforced.
- **Exposure**: Do NOT expose Redis or PostgreSQL ports directly to the public internet. The `docker-compose.yml` only exposes port 80 (Frontend) and 2520 (Backend API).
