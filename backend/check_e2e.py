"""End-to-end system check for Saarthi AI project."""
import asyncio
import sys
import os
import traceback

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Load .env first
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

results = []

def ok(name, detail=""):
    results.append(("OK", name, detail))
    print(f"  [OK] {name}: {detail}" if detail else f"  [OK] {name}")

def fail(name, detail=""):
    results.append(("FAIL", name, detail))
    print(f"  [FAIL] {name}: {detail}" if detail else f"  [FAIL] {name}")

def warn(name, detail=""):
    results.append(("WARN", name, detail))
    print(f"  [WARN] {name}: {detail}" if detail else f"  [WARN] {name}")

print("\n" + "="*60)
print("  SAARTHI AI -- END-TO-END SYSTEM CHECK")
print("="*60)

# 1. Config
print("\n[1] Configuration")
try:
    from app.core.config import get_settings
    s = get_settings()
    ok("Settings loaded", f"{s.APP_NAME} v{s.VERSION}")
    ok("DEBUG mode", str(s.DEBUG))
    if s.GEMINI_API_KEY:
        ok("GEMINI_API_KEY", f"present ({len(s.GEMINI_API_KEY)} chars)")
    else:
        fail("GEMINI_API_KEY", "MISSING -- AI will fail")
    ok("DATABASE_URL", s.DATABASE_URL)
    if s.ALLOWED_ORIGINS:
        ok("ALLOWED_ORIGINS", s.ALLOWED_ORIGINS)
    else:
        warn("ALLOWED_ORIGINS", "empty -- CORS will block all origins")
except Exception as e:
    fail("Settings", str(e))
    traceback.print_exc()

# 2. Database
print("\n[2] Database")
try:
    from app.database.connection import SessionLocal, engine
    import sqlalchemy
    db = SessionLocal()
    db.execute(sqlalchemy.text("SELECT 1"))
    db.close()
    ok("SQLite connection")
except Exception as e:
    fail("SQLite connection", str(e))

try:
    from app.models.models import (
        User, ChatSession, ChatMessage, Goal, Resume
    )
    db = SessionLocal()
    counts = {
        "users": db.execute(sqlalchemy.text("SELECT COUNT(*) FROM users")).scalar(),
        "chat_sessions": db.execute(sqlalchemy.text("SELECT COUNT(*) FROM chat_sessions")).scalar(),
        "chat_messages": db.execute(sqlalchemy.text("SELECT COUNT(*) FROM chat_messages")).scalar(),
        "goals": db.execute(sqlalchemy.text("SELECT COUNT(*) FROM goals")).scalar(),
    }
    db.close()
    ok("DB tables", str(counts))
except Exception as e:
    fail("DB tables", str(e))
    traceback.print_exc()

# 3. Auth Service
print("\n[3] Auth Service")
try:
    from app.services.auth_service import AuthService
    from app.repositories.user_repository import UserRepository
    from app.database.connection import SessionLocal
    db = SessionLocal()
    auth = AuthService(UserRepository(db))
    ok("AuthService instantiated")
    db.close()
except Exception as e:
    fail("AuthService", str(e))
    traceback.print_exc()

try:
    import uuid
    db = SessionLocal()
    auth = AuthService(UserRepository(db))
    test_user = f"test_{uuid.uuid4().hex[:8]}"
    token_data = auth.register_user(test_user, "TestPass123!")
    ok("User registration", f"user={test_user}")
    login_data = auth.authenticate_user(test_user, "TestPass123!")
    if isinstance(login_data, dict):
        has_token = bool(login_data.get("access_token"))
        ref_token = login_data.get("refresh_token")
    else:
        has_token = bool(getattr(login_data, "access_token", None))
        ref_token = getattr(login_data, "refresh_token", None)
    ok("User login", f"access_token present: {has_token}")
    
    # Test refresh token flow
    if ref_token:
        try:
            refreshed = auth.refresh_access_token(ref_token)
            ok("User refresh_token", f"new access_token present: {bool(refreshed.get('access_token'))}")
        except Exception as re:
            fail("User refresh_token", str(re))
            traceback.print_exc()

    from app.models.models import User as UserModel
    db.query(UserModel).filter(UserModel.username == test_user).delete()
    db.commit()
    ok("Test user cleanup")
    db.close()
except Exception as e:
    fail("Auth register/login flow", str(e))
    traceback.print_exc()

# 4. AI Gateway
print("\n[4] AI Gateway")

async def test_gemini():
    try:
        from app.ai.providers.gemini import GeminiProvider
        p = GeminiProvider()
        msgs = [{"role": "user", "content": "Say OK in exactly 2 words"}]
        chunks = []
        async for chunk in p.generate_stream(msgs, "gemini-3.6-flash"):
            chunks.append(chunk)
        result = "".join(chunks)
        if result:
            ok("Gemini API direct", f"response: '{result[:60]}'")
        else:
            fail("Gemini API direct", "Empty response")
    except Exception as e:
        fail("Gemini API direct", str(e))

async def test_gateway():
    try:
        from app.ai.gateway import AIGateway
        gw = AIGateway()
        msgs = [{"role": "user", "content": "Reply with just: hello"}]
        chunks = []
        async for chunk in gw.generate_response_stream(msgs, personality="default"):
            chunks.append(chunk)
        result = "".join(chunks)
        if result and "unavailable" not in result.lower():
            ok("AIGateway.generate_response_stream", f"'{result[:60]}'")
        else:
            fail("AIGateway.generate_response_stream", f"Bad response: '{result[:80]}'")
    except Exception as e:
        fail("AIGateway.generate_response_stream", str(e))
        traceback.print_exc()

asyncio.run(test_gemini())
asyncio.run(test_gateway())

# 5. FastAPI App import
print("\n[5] FastAPI App and Routers")
try:
    from app.main import app
    ok("FastAPI app import")
    openapi = app.openapi()
    routes = list(openapi.get("paths", {}).keys())
    ok("Routes registered", f"{len(routes)} OpenAPI endpoints")
    expected_routes = [
        "/api/auth/register", "/api/auth/login", "/api/health", "/api/chat",
        "/api/resume/upload", "/api/roadmap/generate", "/api/jobs/search",
        "/api/interview/evaluate", "/api/goals/", "/api/profile",
        "/api/career/dashboard", "/api/research/analyze", "/api/projects/generate"
    ]
    for ep in expected_routes:
        if ep in routes:
            ok(f"Route exists: {ep}")
        else:
            fail(f"Route missing: {ep}")
except Exception as e:
    fail("FastAPI app import", str(e))
    traceback.print_exc()

# 6. Services import
print("\n[6] Backend Services Imports")
import importlib
services_to_check = [
    ("app.services.auth_service", "AuthService"),
    ("app.services.voice_service", "VoiceService"),
    ("app.engine.outbox_worker", "OutboxWorker"),
    ("app.ai.gateway", "AIGateway"),
    ("app.ai.prompt_manager", "PromptManager"),
]
for module_name, class_name in services_to_check:
    try:
        mod = importlib.import_module(module_name)
        getattr(mod, class_name)
        ok(f"{class_name} importable")
    except Exception as e:
        fail(f"{module_name}.{class_name}", str(e))

# 7. Prompt Files
print("\n[7] Prompt Files")
try:
    from app.ai.prompt_manager import PromptManager
    result = PromptManager.load("system/default")
    if result.startswith("Error:"):
        fail("Prompt system/default", result)
    else:
        ok("Prompt system/default", f"{len(result)} chars")
except Exception as e:
    fail("Prompt loading", str(e))

# 8. Redis
print("\n[8] Redis Cache")
async def test_redis():
    try:
        from app.core.cache import RedisCache
        c = RedisCache()
        await c.connect()
        if c.redis_client:
            ok("Redis", "connected")
            await c.close()
        else:
            warn("Redis", "not available -- app uses in-memory fallback (OK for dev)")
    except Exception as e:
        warn("Redis", f"offline: {e}")

asyncio.run(test_redis())

# Summary
print("\n" + "="*60)
print("  SUMMARY")
print("="*60)
fails = [r for r in results if r[0] == "FAIL"]
warns = [r for r in results if r[0] == "WARN"]
oks = [r for r in results if r[0] == "OK"]

print(f"\n  PASS: {len(oks)}")
print(f"  WARN: {len(warns)}")
print(f"  FAIL: {len(fails)}")

if fails:
    print("\nFAILURES:")
    for _, name, detail in fails:
        print(f"   - {name}: {detail}")
if warns:
    print("\nWARNINGS:")
    for _, name, detail in warns:
        print(f"   - {name}: {detail}")

print("\nDone.")
