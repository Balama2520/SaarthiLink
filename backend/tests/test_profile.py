"""
Tests for the Profile API endpoints.
Uses the shared conftest fixtures: client, auth_headers.
"""
import pytest
from fastapi.testclient import TestClient


def test_profile_unauthorized(client: TestClient):
    """Accessing /profile without a token must return 401."""
    response = client.get("/api/profile")
    assert response.status_code == 401


def test_get_profile_authorized(client: TestClient, auth_headers: dict):
    """Authenticated GET /profile must return a valid profile object."""
    response = client.get("/api/profile", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "user_id" in data


def test_patch_profile(client: TestClient, auth_headers: dict):
    """PATCH /profile must update provided fields and leave others intact."""
    update_data = {
        "headline": "Test Headline",
        "career_stage": "Mid Level",
        "work_preferences": ["Remote"],
    }
    response = client.patch("/api/profile", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["headline"] == "Test Headline"
    assert data["career_stage"] == "Mid Level"
    assert data["work_preferences"] == ["Remote"]


def test_get_profile_completeness(client: TestClient, auth_headers: dict):
    """GET /profile/completeness must return overall_percentage, sections, suggestions."""
    response = client.get("/api/profile/completeness", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "overall_percentage" in data
    assert "sections" in data
    assert "suggestions" in data
    assert 0 <= data["overall_percentage"] <= 100
