import sys, os, uuid, json
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("\n" + "="*60)
print("  SAARTHI V1 MASTER SCOPE -- END-TO-END SUITE TEST")
print("="*60)

passed = 0
failed = 0

def log(msg):
    print(msg, flush=True)

def assert_endpoint(method, url, json_body=None, headers=None, expected_status=[200, 201], description=""):
    global passed, failed
    try:
        if method.upper() == "GET":
            res = client.get(url, headers=headers)
        elif method.upper() == "POST":
            res = client.post(url, json=json_body, headers=headers)
        elif method.upper() == "DELETE":
            res = client.delete(url, headers=headers)

        if res.status_code in expected_status:
            log(f"  [PASS] {method} {url} ({res.status_code}) - {description}")
            passed += 1
            return res
        else:
            log(f"  [FAIL] {method} {url} (Expected {expected_status}, got {res.status_code}): {res.text[:300]}")
            failed += 1
            return res
    except Exception as e:
        log(f"  [FAIL] {method} {url} - Exception: {e}")
        failed += 1
        return None

# 1. Health & Telemetry
log("\n--- 1. Core Health & Telemetry ---")
assert_endpoint("GET", "/api/health", description="Health check endpoint")
assert_endpoint("GET", "/telemetry", description="System telemetry endpoint")

# 2. Auth Flow (Register, Login, Refresh, Logout)
log("\n--- 2. Authentication & User Identity ---")
test_username = f"e2e_user_{uuid.uuid4().hex[:6]}"
test_pass = "SecurePass123!"

reg_res = assert_endpoint("POST", "/api/auth/register", json_body={"username": test_username, "password": test_pass}, description="User Registration")
token = None
refresh_token = None
if reg_res and reg_res.status_code == 200:
    token = reg_res.json().get("access_token")
    refresh_token = reg_res.json().get("refresh_token")

login_res = assert_endpoint("POST", "/api/auth/login", json_body={"username": test_username, "password": test_pass}, description="User Login")
if login_res and login_res.status_code == 200:
    token = login_res.json().get("access_token")
    refresh_token = login_res.json().get("refresh_token")

auth_headers = {"Authorization": f"Bearer {token}"} if token else {}

# Test Refresh Token
if refresh_token:
    ref_res = assert_endpoint("POST", "/api/auth/refresh", json_body={"refresh_token": refresh_token}, description="Access Token Refresh")

# 3. User Profile & Completeness
log("\n--- 3. User Profile & Completeness ---")
assert_endpoint("GET", "/api/profile", headers=auth_headers, expected_status=[200, 404], description="Fetch User Profile")
assert_endpoint("GET", "/api/profile/completeness", headers=auth_headers, expected_status=[200, 404], description="Profile Completeness Score")

# 4. Goals Navigator
log("\n--- 4. Goal Navigator ---")
goal_res = assert_endpoint("POST", "/api/goals/", json_body={"title": "Master Fullstack Career OS", "description": "Build Saarthi V1"}, headers=auth_headers, description="Create Career Goal")
assert_endpoint("GET", "/api/goals/", headers=auth_headers, description="List Career Goals")

# 5. Career Copilot Intelligence
log("\n--- 5. Career Copilot Intelligence ---")
assert_endpoint("GET", "/api/career/dashboard", headers=auth_headers, description="Career Dashboard Summary")
assert_endpoint("GET", "/api/career/mission", headers=auth_headers, description="Daily Mission Generation")
assert_endpoint("POST", "/api/career/skill-gap", json_body={"target_role": "Fullstack Engineer"}, headers=auth_headers, description="Skill Gap Analysis")

# 6. Job Board & Recommendations
log("\n--- 6. Job Finder & Save ---")
assert_endpoint("GET", "/api/jobs/search?q=Developer", headers=auth_headers, description="Search Jobs")
assert_endpoint("GET", "/api/jobs/recommended", headers=auth_headers, description="Job Recommendations")
assert_endpoint("GET", "/api/jobs/saved", headers=auth_headers, description="List Saved Jobs")

# 7. Sessions & Streaming Chat
log("\n--- 7. Sessions & AI Chat ---")
sess_res = assert_endpoint("POST", "/api/sessions/", json_body={"title": "Career Advice Session"}, headers=auth_headers, description="Create Chat Session")
session_id = sess_res.json().get("id") if (sess_res and sess_res.status_code == 200) else "default"
assert_endpoint("GET", "/api/sessions/", headers=auth_headers, description="List Sessions")

# Chat Stream call
try:
    chat_payload = {"message": "Hello Saarthi, state my top priority task.", "session_id": session_id, "personality": "default"}
    chat_res = client.post("/api/chat", json=chat_payload, headers=auth_headers)
    if chat_res.status_code == 200 and len(chat_res.text) > 0:
        log(f"  [PASS] POST /api/chat (200) - AI Chat Stream Response ('{chat_res.text[:60]}...')")
        passed += 1
    else:
        log(f"  [FAIL] POST /api/chat ({chat_res.status_code}): {chat_res.text[:200]}")
        failed += 1
except Exception as e:
    log(f"  [FAIL] POST /api/chat - Exception: {e}")
    failed += 1

# 8. Learning Roadmap & Skills
log("\n--- 8. Learning Roadmaps & Skill Forge ---")
assert_endpoint("POST", "/api/roadmap/generate", json_body={"target_role": "Fullstack Engineer", "current_skills": ["Python", "JavaScript"]}, headers=auth_headers, description="Generate Learning Roadmap")

# 9. Interview Coach
log("\n--- 9. Interview Coach ---")
assert_endpoint("POST", "/api/interview/evaluate", json_body={"transcript": "I am a computer science student with fullstack python and react skills.", "target_role": "Fullstack Engineer"}, headers=auth_headers, description="Evaluate Interview Answer")

# 10. Research Hub & Projects
log("\n--- 10. Research Hub & Projects ---")
try:
    res_file = client.post("/api/research/analyze", files={"file": ("paper.txt", b"Abstract: Agentic AI Systems in Career OS", "text/plain")}, headers=auth_headers)
    if res_file.status_code in [200, 201]:
        log(f"  [PASS] POST /api/research/analyze ({res_file.status_code}) - Analyze Research Topic")
        passed += 1
    else:
        log(f"  [FAIL] POST /api/research/analyze ({res_file.status_code}): {res_file.text[:200]}")
        failed += 1
except Exception as e:
    log(f"  [FAIL] POST /api/research/analyze - Exception: {e}")
    failed += 1

assert_endpoint("POST", "/api/projects/generate", json_body={"target_role": "Fullstack Engineer", "current_skills": "Python, React"}, headers=auth_headers, description="Generate Skill Forge Project")

# 11. Graduate Hub & Academics
log("\n--- 11. Graduate Hub & Academics ---")
assert_endpoint("GET", "/api/gradhub/degree", headers=auth_headers, description="Get Degree Info")
assert_endpoint("GET", "/api/gradhub/certs", headers=auth_headers, description="Get Certifications")
assert_endpoint("GET", "/api/gradhub/placements", headers=auth_headers, description="Get Placement Records")

# 12. Notes & Workspaces
log("\n--- 12. AI Workspaces & Notes ---")
assert_endpoint("GET", "/api/notes/list", headers=auth_headers, description="List Study Notes")
assert_endpoint("GET", "/api/workspace/", headers=auth_headers, description="List AI Workspaces")

# 13. Admin Panel
log("\n--- 13. Admin Panel ---")
assert_endpoint("GET", "/api/admin/stats", headers=auth_headers, expected_status=[200, 403], description="Admin Stats Check")

# 14. Logout
log("\n--- 14. Logout ---")
if refresh_token:
    assert_endpoint("POST", "/api/auth/logout", json_body={"refresh_token": refresh_token}, headers=auth_headers, description="User Logout")

log("\n" + "="*60)
log(f"  TOTAL ENDPOINT TESTS PASSED: {passed}")
log(f"  TOTAL ENDPOINT TESTS FAILED: {failed}")
log("="*60 + "\n")
