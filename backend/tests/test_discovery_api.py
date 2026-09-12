"""
Tests for Discovery, Feedback, Contact, and Opportunity APIs.
Uses the shared `client` fixture from conftest so the in-memory DB
(with all models created) is always available.
"""
import pytest
from fastapi.testclient import TestClient


# ── All tests use the `client` fixture from conftest.py ──────────────────────
# That fixture wires the FastAPI app to an in-memory SQLite DB with
# Base.metadata.create_all() — including all new discovery models.


class TestDiscoveryOptions:

    def test_get_discovery_options(self, client):
        res = client.get("/api/discovery/options")
        assert res.status_code == 200
        data = res.json()
        assert "user_types" in data
        assert "intent_options" in data
        assert "challenge_areas" in data
        assert data["feature_count"] == 34

    def test_user_types_include_expected_keys(self, client):
        res = client.get("/api/discovery/options")
        keys = [t["key"] for t in res.json()["user_types"]]
        assert "student" in keys
        assert "recruiter" in keys
        assert "other" in keys


class TestDiscoverySubmission:

    def test_submit_discovery_full_flow(self, client):
        payload = {
            "session_id": "test_session_full_flow",
            "user_type": "student",
            "consent_given": True,
            "intents": [
                {"intent_key": "find_first_job", "intent_label": "Find first job", "is_primary": True}
            ],
            "challenges": {
                "finding_relevant_jobs": 4,
                "resume_improvement": 5,
                "biggest_difficulty": "ATS rejections",
            },
            "feature_feedbacks": [
                {
                    "feature_id": 1,
                    "feature_key": "job_discovery",
                    "feature_label": "Smart Job Discovery Engine",
                    "rating": "extremely_valuable",
                    "is_want_next": True,
                }
            ],
            "product_feedback": {
                "what_you_like": "AI ATS score",
                "wish_saarthi_could": "Provide automated job apply links",
            },
            "opportunity_signal": {
                "company": "Acme Corp",
                "role": "SDE Intern",
                "public_job_url": "https://example.com/jobs/sde-intern",
            },
        }
        res = client.post("/api/discovery/submit", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "profile_id" in data

    def test_submit_discovery_minimal_payload(self, client):
        payload = {
            "session_id": "test_minimal_session",
            "user_type": "job_seeker",
            "consent_given": True,
        }
        res = client.post("/api/discovery/submit", json=payload)
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    def test_duplicate_session_updates_profile(self, client):
        payload = {"session_id": "same_session_x1", "user_type": "student", "consent_given": True}
        r1 = client.post("/api/discovery/submit", json=payload)
        r2 = client.post("/api/discovery/submit", json=payload)
        assert r1.status_code == 200
        assert r2.status_code == 200
        # Both should succeed (upsert pattern)
        assert r1.json()["status"] == "success"
        assert r2.json()["status"] == "success"


class TestFeedbackAPI:

    def test_list_34_features(self, client):
        res = client.get("/api/feedback/features")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 34
        assert len(data["features"]) == 34

    def test_features_have_required_fields(self, client):
        res = client.get("/api/feedback/features")
        for f in res.json()["features"]:
            assert "id" in f
            assert "key" in f
            assert "label" in f
            assert "group" in f

    def test_feature_ids_are_1_to_34(self, client):
        res = client.get("/api/feedback/features")
        ids = sorted([f["id"] for f in res.json()["features"]])
        assert ids == list(range(1, 35))

    def test_submit_feature_rating(self, client):
        payload = {
            "feature_id": 2,
            "rating": "very_useful",
            "comment": "Helped improve ATS score",
        }
        res = client.post(
            "/api/feedback/feature",
            json=payload,
            headers={"X-Session-ID": "test_feature_session"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["feature_id"] == 2

    def test_submit_feature_rating_invalid_id(self, client):
        payload = {"feature_id": 99, "rating": "useful"}
        res = client.post(
            "/api/feedback/feature",
            json=payload,
            headers={"X-Session-ID": "test_feature_session_2"},
        )
        assert res.status_code == 400

    def test_submit_product_feedback(self, client):
        payload = {
            "what_you_like": "AI ATS",
            "wish_saarthi_could": "Auto apply",
        }
        res = client.post(
            "/api/feedback/product",
            json=payload,
            headers={"X-Session-ID": "test_product_session"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "success"


class TestContactAPI:

    def test_submit_contact_form(self, client):
        payload = {
            "name": "Bala Maneesh",
            "email": "test@example.com",
            "role_type": "student",
            "reason": "feedback",
            "message": "Great platform! Love the AI integration.",
            "consent_given": True,
        }
        res = client.post("/api/contact", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "saarthi.ai.team@gmail.com" in data["message"]

    def test_get_contact_info(self, client):
        res = client.get("/api/contact/info")
        assert res.status_code == 200
        data = res.json()
        assert data["contact_email"] == "saarthi.ai.team@gmail.com"
        assert data["lead_architect"] == "Bala Maneesh Ayanala"

    def test_contact_requires_name(self, client):
        payload = {
            "email": "test@example.com",
            "message": "Hello",
            "consent_given": True,
        }
        res = client.post("/api/contact", json=payload)
        assert res.status_code == 422  # Pydantic validation error

    def test_contact_requires_valid_email(self, client):
        payload = {
            "name": "Test User",
            "email": "not_an_email",
            "message": "Hello world message",
            "consent_given": True,
        }
        res = client.post("/api/contact", json=payload)
        assert res.status_code == 422

    def test_contact_requires_minimum_message_length(self, client):
        payload = {
            "name": "Test",
            "email": "test@example.com",
            "message": "Hi",  # Too short
            "consent_given": True,
        }
        res = client.post("/api/contact", json=payload)
        assert res.status_code == 422


class TestOpportunitiesAPI:

    def test_submit_opportunity_with_url(self, client):
        payload = {
            "company": "TechCorp",
            "role": "Frontend Engineer",
            "public_job_url": "https://techcorp.com/careers/fe",
            "skills": "React, TypeScript, Tailwind",
        }
        res = client.post("/api/opportunities", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "opportunity_id" in data
        assert data["validation_status"] == "pending"

    def test_submit_opportunity_with_company_only(self, client):
        payload = {
            "company": "Acme Inc",
            "role": "Data Scientist",
        }
        res = client.post("/api/opportunities", json=payload)
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    def test_submit_opportunity_requires_company_or_url(self, client):
        payload = {"skills": "Python"}  # No company or URL
        res = client.post("/api/opportunities", json=payload)
        assert res.status_code == 400
