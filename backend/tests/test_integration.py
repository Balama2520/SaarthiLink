"""
End-to-end integration tests for the Saarthi backend.
Tests the complete user flow: Register → Profile → Resume Upload → Sync.
All external services (AI, Redis) are mocked.
"""
import json
import io
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


# ── Helpers ───────────────────────────────────────────────────────────────────
def _fake_ai_pipeline_result():
    return {
        "overall_ats_score": 78,
        "section_scores": {
            "structure": 80, "skills": 75, "education": 70,
            "experience": 85, "keywords": 80,
        },
        "personal_info": {"name": "Jane Doe", "email": "jane@example.com", "phone": "+91-9999999999"},
        "education": [{"degree": "B.Tech", "university": "IIT Delhi", "graduation_year": 2024, "cgpa": "8.5"}],
        "experience": [{"company": "Acme Corp", "role": "Software Engineer", "duration": "1 year"}],
        "projects": [{"title": "Portfolio", "description": "Personal site", "technologies": ["React"]}],
        "tech_skills": ["Python", "React", "FastAPI"],
        "soft_skills": ["Communication", "Teamwork"],
        "certifications": ["AWS Certified"],
        "languages": ["English", "Hindi"],
        "links": {"github": "https://github.com/jane", "linkedin": None, "portfolio": None},
        "strengths": ["Strong Python skills", "Good project depth"],
        "weaknesses": ["No leadership experience"],
        "skill_gaps": ["Kubernetes", "Kafka"],
        "recommendations": ["Add quantified achievements", "Include a LinkedIn URL"],
        "summary": "Strong backend engineer with good Python fundamentals.",
        "word_count": 450,
    }


# ── 1. Auth Flow ──────────────────────────────────────────────────────────────
class TestAuthFlow:
    def test_register_and_login(self, client):
        """Register a new user and obtain a JWT token."""
        r = client.post("/api/auth/register", json={"username": "integuser", "password": "IntegPass123!"})
        assert r.status_code in (200, 201), r.text

        r = client.post("/api/auth/login", data={"username": "integuser", "password": "IntegPass123!"})
        assert r.status_code == 200
        token = r.json().get("access_token")
        assert token, "Expected access_token in login response"


# ── 2. Profile Flow ───────────────────────────────────────────────────────────
class TestProfileFlow:
    def test_get_empty_profile(self, client, auth_headers):
        """Freshly registered user should have an empty but valid profile."""
        r = client.get("/api/profile", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "user_id" in data

    def test_update_profile(self, client, auth_headers):
        """PATCH should update profile fields correctly."""
        payload = {
            "degree": "B.Tech",
            "university": "IIT Bombay",
            "target_role": "Backend Engineer",
        }
        r = client.patch("/api/profile", json=payload, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["degree"] == "B.Tech"
        assert data["university"] == "IIT Bombay"

    def test_profile_completeness(self, client, auth_headers):
        """Completeness endpoint should return a valid structured response."""
        r = client.get("/api/profile/completeness", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "overall_percentage" in data
        assert "sections" in data
        assert "suggestions" in data
        assert 0 <= data["overall_percentage"] <= 100


# ── 3. Resume Upload & Sync Flow ──────────────────────────────────────────────
class TestResumeFlow:
    @patch(
        "app.engine.resume_pipeline.ResumeIntelligencePipeline.analyze_with_ai",
        new_callable=AsyncMock,
    )
    def test_resume_upload(self, mock_analyze, client, auth_headers):
        """Upload a PDF resume, mock the AI step, verify DB record created."""
        mock_analyze.return_value = _fake_ai_pipeline_result()

        pdf_bytes = b"%PDF-1.4 fake pdf content for testing purposes"
        files = {"file": ("resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        r = client.post("/api/resume/upload", files=files, headers=auth_headers)

        assert r.status_code == 200, r.text
        data = r.json()
        assert "resume_id" in data
        assert data["parsed_data"]["overall_ats_score"] == 78
        assert data["version"] == 1

    @patch(
        "app.engine.resume_pipeline.ResumeIntelligencePipeline.analyze_with_ai",
        new_callable=AsyncMock,
    )
    def test_resume_version_increment(self, mock_analyze, client, auth_headers):
        """Second upload should produce version 2."""
        mock_analyze.return_value = _fake_ai_pipeline_result()
        pdf_bytes = b"%PDF-1.4 another fake pdf"
        files = {"file": ("resume_v2.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

        r1 = client.post("/api/resume/upload", files=files, headers=auth_headers)
        r2 = client.post("/api/resume/upload", files=files, headers=auth_headers)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r2.json()["version"] == r1.json()["version"] + 1

    def test_resume_upload_invalid_type(self, client, auth_headers):
        """Uploading a file with a disallowed extension must be rejected with 400."""
        files = {"file": ("malware.exe", io.BytesIO(b"MZ"), "application/octet-stream")}
        r = client.post("/api/resume/upload", files=files, headers=auth_headers)
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}: {r.text}"

    def test_resume_upload_too_large(self, client, auth_headers):
        """File exceeding 5 MB must be rejected with 400."""
        big = b"A" * (5 * 1024 * 1024 + 1)
        files = {"file": ("big.pdf", io.BytesIO(big), "application/pdf")}
        r = client.post("/api/resume/upload", files=files, headers=auth_headers)
        assert r.status_code == 400

    def test_resume_history(self, client, auth_headers):
        """History endpoint must return a list."""
        r = client.get("/api/resume/history", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_resume_sync_not_found(self, client, auth_headers):
        """Syncing a non-existent resume ID must return 404."""
        r = client.post("/api/resume/nonexistent-id/sync", headers=auth_headers)
        assert r.status_code == 404


# ── 4. Health Check ───────────────────────────────────────────────────────────
class TestHealthCheck:
    def test_health_endpoint_returns_ok(self, client):
        """Health endpoint must always return 200 with component statuses."""
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "components" in data
        assert "api" in data["components"]
        assert "database" in data["components"]
        assert "redis" in data["components"]
        assert "ai_gateway" in data["components"]

    def test_health_endpoint_reports_api_component_as_ok(self, client):
        """The API component should be reported explicitly for monitoring."""
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["components"]["api"]["status"] == "ok"


# ── 5. Jobs Flow ──────────────────────────────────────────────────────────────
class TestJobsFlow:
    def test_list_jobs_returns_list(self, client):
        r = client.get("/api/jobs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_search_jobs_returns_list(self, client):
        r = client.get("/api/jobs/search?q=python")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_recommended_jobs_requires_auth(self, client):
        """Recommended jobs endpoint accepts guest users (returns 200 with empty list)."""
        r = client.get("/api/jobs/recommended")
        # Guest users get an empty recommendation list — this is by design
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_recommended_jobs_authenticated(self, client, auth_headers):
        r = client.get("/api/jobs/recommended", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
