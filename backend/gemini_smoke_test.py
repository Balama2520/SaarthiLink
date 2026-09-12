"""
Gemini live smoke test — backend only.
Reads key from environment. Never prints key.
Tests: model validity, real API call, response shape.
"""
import asyncio
import os
import sys

# Load .env first
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

KNOWN_VALID_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-8b",
]

print("=" * 60)
print("SAARTHI AI — GEMINI SMOKE TEST")
print("=" * 60)

# 1. Key presence check (no value printed)
if not GEMINI_KEY:
    print("GEMINI_API_KEY: NOT SET → CONFIG_REQUIRED")
    sys.exit(2)

key_prefix = GEMINI_KEY[:6] + "..." if len(GEMINI_KEY) > 6 else "***"
print(f"GEMINI_API_KEY: PRESENT (prefix={key_prefix}, len={len(GEMINI_KEY)})")

# 2. Key format check
if GEMINI_KEY.startswith("AIza"):
    print(f"KEY FORMAT: STANDARD (AIza... format)")
elif GEMINI_KEY.startswith("AQ."):
    print(f"KEY FORMAT: WARNING — 'AQ.' prefix is unusual for Gemini REST API keys.")
    print(f"  Standard Gemini REST API keys begin with 'AIza'.")
    print(f"  'AQ.' is typically an OAuth2 access token (short-lived) or a different credential type.")
    print(f"  This key may fail or have already expired.")
else:
    print(f"KEY FORMAT: UNKNOWN — does not match known Gemini key patterns (AIza...)")

# 3. Model name check
print(f"\nGEMINI_MODEL: {GEMINI_MODEL}")
if GEMINI_MODEL in KNOWN_VALID_MODELS:
    print(f"MODEL VALIDITY: VALID (in known list)")
else:
    print(f"MODEL VALIDITY: INVALID — '{GEMINI_MODEL}' is not a recognized Gemini model.")
    print(f"  Valid models: {', '.join(KNOWN_VALID_MODELS)}")
    print(f"  RECOMMENDED: gemini-2.5-flash")

# 4. Live API call
print(f"\nLIVE API CALL: Testing model={GEMINI_MODEL} ...")

import httpx
import json

async def test_gemini():
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_KEY}"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": "Reply with exactly: SAARTHI_SMOKE_TEST_OK"}]}]
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload)
            status = resp.status_code
            print(f"HTTP STATUS: {status}")
            if status == 200:
                data = resp.json()
                # Extract text safely
                try:
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    print(f"RESPONSE TEXT: {text.strip()}")
                    if "SAARTHI_SMOKE_TEST_OK" in text:
                        print("RESULT: LIVE_VERIFIED ✓")
                    else:
                        print("RESULT: LIVE_VERIFIED (response received, content differs)")
                    return True
                except (KeyError, IndexError) as e:
                    print(f"RESULT: LIVE_VERIFICATION_FAILED — unexpected response shape: {e}")
                    print(f"  Raw response keys: {list(data.keys())}")
                    return False
            elif status == 400:
                body = resp.json()
                err_msg = body.get("error", {}).get("message", "unknown")
                print(f"RESULT: LIVE_VERIFICATION_FAILED — 400 Bad Request")
                print(f"  Error: {err_msg}")
                if "not found" in err_msg.lower() or "model" in err_msg.lower():
                    print(f"  DIAGNOSIS: Model '{GEMINI_MODEL}' does not exist or is not accessible.")
                return False
            elif status == 401:
                print(f"RESULT: LIVE_VERIFICATION_FAILED — 401 Unauthorized")
                print(f"  DIAGNOSIS: API key is invalid, expired, or wrong type.")
                return False
            elif status == 403:
                body = resp.json()
                err_msg = body.get("error", {}).get("message", "unknown")
                print(f"RESULT: LIVE_VERIFICATION_FAILED — 403 Forbidden")
                print(f"  Error: {err_msg}")
                return False
            elif status == 404:
                body = resp.json()
                err_msg = body.get("error", {}).get("message", "unknown")
                print(f"RESULT: LIVE_VERIFICATION_FAILED — 404 Not Found")
                print(f"  Error: {err_msg}")
                print(f"  DIAGNOSIS: Model '{GEMINI_MODEL}' not found. Check model name.")
                return False
            else:
                print(f"RESULT: LIVE_VERIFICATION_FAILED — HTTP {status}")
                print(f"  Body (truncated): {resp.text[:300]}")
                return False
    except httpx.TimeoutException:
        print("RESULT: LIVE_VERIFICATION_FAILED — Request timed out (20s)")
        return False
    except httpx.ConnectError as e:
        print(f"RESULT: LIVE_VERIFICATION_FAILED — Connection error: {e}")
        return False
    except Exception as e:
        print(f"RESULT: LIVE_VERIFICATION_FAILED — Unexpected error: {type(e).__name__}: {e}")
        return False

result = asyncio.run(test_gemini())

# 5. List available models
print(f"\nLISTING AVAILABLE MODELS (to identify correct name) ...")
async def list_models():
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_KEY}&pageSize=50"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                models = data.get("models", [])
                flash_models = [m.get("name","") for m in models if "flash" in m.get("name","").lower()]
                pro_models = [m.get("name","") for m in models if "pro" in m.get("name","").lower() and "flash" not in m.get("name","").lower()]
                print(f"  Flash models: {flash_models[:8]}")
                print(f"  Pro models: {pro_models[:5]}")
            elif resp.status_code == 401:
                print(f"  Could not list models — 401 Unauthorized (key invalid/expired)")
            else:
                print(f"  Could not list models — HTTP {resp.status_code}")
    except Exception as e:
        print(f"  Could not list models — {type(e).__name__}: {e}")

asyncio.run(list_models())
print("=" * 60)
