"""
Saarthi AI — Phase 10 Complete Candidate E2E Flow
Tests all flows using the FastAPI TestClient (no live server needed).
"""
import sys, os, json, random, string
sys.path.insert(0, os.path.dirname(__file__))
os.environ['DEBUG'] = 'true'

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

uid = ''.join(random.choices(string.ascii_lowercase, k=6))
email = f'test_{uid}@saarthi-test.local'
password = 'TestPass123!'
username = f'testuser_{uid}'

results = []

def check(step, r, expect_status=None, notes=""):
    ok = r.status_code == expect_status if expect_status else (r.status_code < 400)
    body_preview = str(r.json())[:120] if r.headers.get('content-type','').startswith('application/json') else r.text[:80]
    status = "PASS" if ok else "FAIL"
    results.append((step, status, r.status_code, body_preview[:80]))
    print(f"  [{status}] {step}: HTTP {r.status_code} | {body_preview[:80]}")
    return r


print("=" * 70)
print("SAARTHI AI — PHASE 10 CANDIDATE E2E FLOW")
print("=" * 70)

# --- AUTH ---
print("\n[AUTH]")
r = check("REGISTER", client.post('/api/auth/register', json={
    'username': username, 'email': email, 'password': password
}))
r = check("LOGIN", client.post('/api/auth/login', data={'username': username, 'password': password}))
token = r.json().get('access_token', '') if r.status_code == 200 else ''
headers = {'Authorization': f'Bearer {token}'}

# --- PROFILE ---
print("\n[PROFILE]")
check("GET_PROFILE", client.get('/api/profile', headers=headers))
check("UPDATE_PROFILE", client.patch('/api/profile',
    json={'skills': 'Python, FastAPI, SQL', 'experience_years': 2, 'location': 'Bangalore'},
    headers=headers))
check("PROFILE_COMPLETENESS", client.get('/api/profile/completeness', headers=headers))

# --- JOBS ---
print("\n[JOBS]")
r_jobs = client.get('/api/jobs')
check("LIST_JOBS", r_jobs)
check("SEARCH_JOBS", client.get('/api/jobs?search=python'))
check("RECOMMENDED_JOBS_GUEST", client.get('/api/jobs/recommended'), expect_status=200)
check("RECOMMENDED_JOBS_AUTH", client.get('/api/jobs/recommended', headers=headers))

# --- GOALS ---
print("\n[GOALS]")
check("CREATE_GOAL", client.post('/api/goals',
    json={'title': 'Land Backend Role', 'description': 'Get a FastAPI job', 'target_date': '2027-01-01'},
    headers=headers))
check("LIST_GOALS", client.get('/api/goals', headers=headers))

# --- DISCOVERY ---
print("\n[DISCOVERY]")
check("DISCOVERY_OPTIONS", client.get('/api/discovery/options'))
check("DISCOVERY_SUBMIT", client.post('/api/discovery/submit', json={
    'session_id': f'smoke_{uid}',
    'user_type': 'student',
    'goals': ['Get a job'],
    'interests': ['Python', 'Backend'],
    'experience_level': 'fresher'
}))

# --- 34-FEATURE FEEDBACK ---
print("\n[FEEDBACK]")
r_feat = client.get('/api/feedback/features')
check("LIST_34_FEATURES", r_feat)
feature_count = len(r_feat.json().get('features', [])) if r_feat.status_code == 200 and isinstance(r_feat.json(), dict) else 0
print(f"    Feature count: {feature_count} (expected: 34)")

check("FEATURE_FEEDBACK_VALID", client.post('/api/feedback/feature',
    json={'feature_id': 1, 'rating': 5, 'comment': 'Works well'}))
check("FEATURE_FEEDBACK_INVALID_ID", client.post('/api/feedback/feature',
    json={'feature_id': 99, 'rating': 5, 'comment': 'Bad ID'}), expect_status=400)
check("PRODUCT_FEEDBACK", client.post('/api/feedback/product',
    json={'message': 'Smoke test product feedback - system feels solid', 'category': 'general'}))

# --- OPPORTUNITY SIGNALS ---
print("\n[OPPORTUNITY SIGNALS]")
check("OPPORTUNITY_WITH_URL", client.post('/api/opportunities', json={
    'company_name': 'Test Corp',
    'public_job_url': 'https://example.com/jobs/backend-engineer',
    'role_title': 'Backend Engineer',
    'required_skills': 'Python, FastAPI'
}))
check("OPPORTUNITY_WITH_COMPANY_ONLY", client.post('/api/opportunities', json={
    'company_name': 'Another Corp',
    'role_title': 'Data Engineer'
}))
check("OPPORTUNITY_REQUIRES_COMPANY_OR_URL", client.post('/api/opportunities', json={
    'role_title': 'SRE'
}), expect_status=400)

# --- CONTACT ---
print("\n[CONTACT]")
check("CONTACT_SUBMIT", client.post('/api/contact', json={
    'name': 'Smoke Tester',
    'email': 'smoketest@saarthi-test.com',
    'message': 'This is a verification smoke test. The system is being validated for production readiness.',
    'reason': 'Product Feedback',
    'reply_consent': True
}))
check("CONTACT_INFO", client.get('/api/contact/info'))
check("CONTACT_REQUIRES_NAME", client.post('/api/contact', json={
    'email': 'a@b.com', 'message': 'test'
}), expect_status=422)

# --- ADMIN ---
print("\n[ADMIN]")
check("ADMIN_NO_AUTH", client.get('/api/admin/stats'), expect_status=401)
check("ADMIN_NORMAL_USER", client.get('/api/admin/stats', headers=headers), expect_status=403)

# --- INTELLIGENCE SERVICE (unit-level) ---
print("\n[INTELLIGENCE SERVICE]")
from app.services.intelligence_service import IntelligenceService
svc = IntelligenceService()
result = svc.analyze_job_relevance(
    user_skills=['python', 'fastapi', 'sql'],
    user_yoe=2,
    job_title='Backend Engineer',
    job_required_skills=['python', 'fastapi', 'postgresql', 'docker'],
    job_min_yoe=1,
)
has_facts = 'facts' in result
has_inferences = 'inferences' in result
has_ai_suggestions = 'ai_suggestions' in result
match_pct = result.get('inferences', {}).get('match_percentage', 0)
missing = result.get('inferences', {}).get('missing_skills', [])
print(f"  [{'PASS' if has_facts else 'FAIL'}] FACT separation: {has_facts}")
print(f"  [{'PASS' if has_inferences else 'FAIL'}] INFERENCE separation: {has_inferences}")
print(f"  [{'PASS' if has_ai_suggestions else 'FAIL'}] AI_SUGGESTION separation: {has_ai_suggestions}")
print(f"  match_percentage: {match_pct}% | missing_skills: {missing}")

# --- HEALTH ---
print("\n[HEALTH]")
r_h = client.get('/api/health')
h = r_h.json()
check("HEALTH_ENDPOINT", r_h)
for comp, cdata in h.get('components', {}).items():
    print(f"    {comp}: {cdata.get('status', '?')}")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
passed = sum(1 for _, s, _, _ in results if s == "PASS")
failed = sum(1 for _, s, _, _ in results if s == "FAIL")
print(f"PASS: {passed} | FAIL: {failed} | TOTAL: {len(results)}")
for step, status, code, body in results:
    if status == "FAIL":
        print(f"  FAIL: {step} (HTTP {code}) — {body[:60]}")
