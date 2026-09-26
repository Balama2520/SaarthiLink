"""
Tests for IntelligenceService and extended admin/seeding endpoints.
"""

import pytest
from app.services.intelligence_service import IntelligenceService


def test_intelligence_service_analyze_job_relevance_high_match():
    service = IntelligenceService(ai_service=None)
    res = service.analyze_job_relevance(
        user_skills=["Python", "FastAPI", "React", "PostgreSQL"],
        user_yoe=3,
        job_title="Full Stack Engineer",
        job_required_skills=["Python", "FastAPI", "React"],
        job_min_yoe=2,
    )
    assert res["facts"]["matched_skills"] == ["python", "fastapi", "react"]
    assert res["inferences"]["match_percentage"] == 100.0
    assert res["inferences"]["yoe_eligible"] is True
    assert res["inferences"]["fit_level"] == "High"
    assert "ai_suggestions" in res
    assert res["ai_suggestions"]["provider_used"] == "rule_engine_fallback"


def test_intelligence_service_analyze_job_relevance_partial_match():
    service = IntelligenceService(ai_service=None)
    res = service.analyze_job_relevance(
        user_skills=["Python"],
        user_yoe=1,
        job_title="Backend Developer",
        job_required_skills=["Python", "Go", "Docker", "Kubernetes"],
        job_min_yoe=3,
    )
    assert res["facts"]["matched_skills"] == ["python"]
    assert res["inferences"]["match_percentage"] == 25.0
    assert res["inferences"]["yoe_eligible"] is False
    assert res["inferences"]["fit_level"] == "Low"
    assert "go" in res["inferences"]["missing_skills"]


def test_intelligence_service_career_guidance():
    service = IntelligenceService(ai_service=None)
    res = service.get_career_guidance(
        target_role="AI Engineer",
        current_skills=["Python", "PyTorch"],
        goals=["Learn LLMs", "Build RAG pipeline"],
    )
    assert res["facts"]["target_role"] == "AI Engineer"
    assert res["inferences"]["total_goals_set"] == 2
    assert "guidance_plan" in res["ai_suggestions"]


@pytest.fixture
def admin_headers(client, db_session, monkeypatch):
    from app.repositories.user_repository import UserRepository
    from app.services.auth_service import AuthService
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "ADMIN_USERNAMES", "saarthiadmin")

    repo = UserRepository(db_session)
    auth_svc = AuthService(repo)
    auth_svc.register_user("saarthiadmin", "AdminPass123!")

    response = client.post(
        "/api/auth/login",
        data={"username": "saarthiadmin", "password": "AdminPass123!"},
    )
    token = response.json().get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


def test_admin_stats_extended_keys(client, admin_headers):
    response = client.get("/api/admin/stats", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "total_jobs" in data
    assert "total_discovery_profiles" in data
    assert "total_feature_feedbacks" in data
    assert "total_contact_requests" in data
    assert "total_opportunity_signals" in data
    assert "total_company_profiles" in data
    assert "sheets_status" in data
    assert "ai_status" in data
    assert data["ai_status"]["primary_provider"] in ("huggingface", "gemini", "none")


def test_run_pipeline_admin_endpoint_unconfigured(client, admin_headers):
    # When sheets is unconfigured, returns success dry_run summary or 503 error
    response = client.post("/api/admin/sheets/run-pipeline?dry_run=true", headers=admin_headers)
    assert response.status_code in (200, 503)
