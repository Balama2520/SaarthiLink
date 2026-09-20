"""
Security and isolation tests for Saarthi V1.
Covers: refresh token flow, logout invalidation, cross-user isolation,
admin auth matrix, and graceful Redis-unavailable degradation.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.models import User, Resume, ChatSession, Goal
from app.repositories.user_repository import UserRepository
from app.repositories.resume_repository import ResumeRepository


def _register_login(client: TestClient, username: str, password: str) -> dict:
    """Helper: register + login a user, return the full login JSON + headers."""
    client.post(
        "/api/auth/register",
        json={"username": username, "password": password},
    )
    login = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
    )
    tokens = login.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "headers": headers,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Refresh token flow
# ═══════════════════════════════════════════════════════════════════════════════


class TestRefreshFlow:
    def test_refresh_returns_new_valid_access_token(self, client):
        """Register -> login -> use refresh token -> get new access token -> use it on protected endpoint."""
        auth = _register_login(client, "refresh_alice", "Pass123!")
        refresh = auth["refresh_token"]

        # Use refresh token
        refresh_res = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh},
        )
        assert refresh_res.status_code == 200, f"Refresh failed: {refresh_res.json()}"
        new_tokens = refresh_res.json()
        assert "access_token" in new_tokens
        assert new_tokens["refresh_token"] == refresh  # same refresh token reused

        # New access token must work on a protected endpoint
        new_headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}
        profile = client.get("/api/profile", headers=new_headers)
        assert (
            profile.status_code == 200
        ), f"New access token rejected: {profile.json()}"

    def test_invalid_access_token_then_refresh_works(self, client):
        """Invalid access token -> 401, then refresh still yields a working access token."""
        auth = _register_login(client, "refresh_bob", "Pass123!")
        refresh = auth["refresh_token"]

        # Forge an obviously-invalid access token (tampered signature)
        bad_headers = {"Authorization": "Bearer definitely.not.a.validjwt.payload.here"}
        profile_bad = client.get("/api/profile", headers=bad_headers)
        assert profile_bad.status_code == 401

        # Now actually refresh and use the new token
        new_access = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh},
        ).json()["access_token"]
        profile_good = client.get(
            "/api/profile",
            headers={"Authorization": f"Bearer {new_access}"},
        )
        assert profile_good.status_code == 200

    def test_invalid_refresh_token_returns_401(self, client):
        """A garbage refresh token must be rejected with 401."""
        res = client.post(
            "/api/auth/refresh",
            json={"refresh_token": "not-a-real-token-xyz"},
        )
        assert res.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Logout invalidates the refresh token
# ═══════════════════════════════════════════════════════════════════════════════


class TestLogoutInvalidation:
    def test_logout_then_refresh_fails_with_401(self, client):
        """After logout, using the same refresh token on /auth/refresh must return 401."""
        auth = _register_login(client, "logout_carol", "Pass123!")
        refresh = auth["refresh_token"]

        # Before logout: refresh works
        before = client.post("/api/auth/refresh", json={"refresh_token": refresh})
        assert before.status_code == 200

        # Call logout
        logout_res = client.post("/api/auth/logout", json={"refresh_token": refresh})
        assert logout_res.status_code == 200

        # After logout: refresh must fail
        after = client.post("/api/auth/refresh", json={"refresh_token": refresh})
        assert after.status_code == 401, (
            f"Refresh token was NOT invalidated after logout! "
            f"Expected 401, got {after.status_code}: {after.json()}"
        )

    def test_logout_with_nonexistent_token_is_silent_200(self, client):
        """Logout on a token that doesn't exist is a no-op that returns 200."""
        res = client.post(
            "/api/auth/logout",
            json={"refresh_token": "nobody-has-this-token"},
        )
        assert res.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Cross-user isolation (IDOR) on resume / goal / session resources
# ═══════════════════════════════════════════════════════════════════════════════


class TestUserIsolation:
    def _create_resume_for(
        self, db: Session, user: User, filename="cv.pdf", raw_text="USER RESUME TEXT"
    ) -> Resume:
        repo = ResumeRepository(db)
        r = Resume(
            user_id=user.id,
            filename=filename,
            file_path="",
            file_size=len(raw_text),
            version=1,
            parsing_status="completed",
            ats_score=75,
            raw_text=raw_text,
        )
        return repo.create(r)

    def _create_goal_for(
        self, db: Session, user: User, title: str = "Land an SDE job"
    ) -> str:
        g = Goal(
            user_id=user.id,
            title=title,
            description="Break into software engineering",
            status="active",
            priority="high",
            progress=0,
            due_date="2026-12-31",
        )
        db.add(g)
        db.commit()
        db.refresh(g)
        return str(g.id)

    def test_user_b_cannot_get_user_a_resume(self, client, db_session):
        """UserB accesses UserA's resume by ID -> 404 on reanalyze and sync endpoints."""
        authA = _register_login(client, "isola_userA", "Pass123!")
        authB = _register_login(client, "isola_userB", "Pass123!")

        userA = UserRepository(db_session).get_user_by_username("isola_userA")
        resumeA = self._create_resume_for(
            db_session, userA, "userA_cv.pdf", "USER A PRIVATE DATA"
        )

        # Resume history only returns userA's own resumes (sanity check on user isolation in list)
        historyA = client.get("/api/resume/history", headers=authA["headers"])
        assert historyA.status_code == 200
        assert len(historyA.json()) == 1

        # UserB tries to fetch UserA's history list: gets empty, not userA resume
        historyB = client.get("/api/resume/history", headers=authB["headers"])
        assert historyB.status_code == 200
        assert all(item["id"] != resumeA.id for item in historyB.json())

        # UserB tries to re-analyze UserA's resume by ID: must be 404
        reanalyzeB = client.post(
            f"/api/resume/{resumeA.id}/reanalyze",
            headers=authB["headers"],
        )
        assert (
            reanalyzeB.status_code == 404
        ), f"IDOR! UserB accessed UserA's resume via reanalyze: {reanalyzeB.status_code}"

        # UserB tries to sync UserA's resume by ID: must be 404
        syncB = client.post(
            f"/api/resume/{resumeA.id}/sync",
            headers=authB["headers"],
        )
        assert (
            syncB.status_code == 404
        ), f"IDOR! UserB synced UserA's resume profile: {syncB.status_code}"

    def test_user_b_cannot_get_user_a_goals(self, client, db_session):
        """UserB GET/PUT/DELETE /api/goals/{UserA_goal_id} -> 404."""
        authA = _register_login(client, "goal_userA", "Pass123!")
        authB = _register_login(client, "goal_userB", "Pass123!")
        userA = UserRepository(db_session).get_user_by_username("goal_userA")

        goalA_id = self._create_goal_for(db_session, userA, "UserA's private goal")

        # UserA list: one goal
        listA = client.get("/api/goals/", headers=authA["headers"])
        assert listA.status_code == 200
        assert len(listA.json()) == 1

        # UserB list: empty (sanity check)
        listB = client.get("/api/goals/", headers=authB["headers"])
        assert listB.status_code == 200
        assert len(listB.json()) == 0

        # UserB direct GET by id: 404
        getB = client.get(f"/api/goals/{goalA_id}", headers=authB["headers"])
        assert (
            getB.status_code == 404
        ), f"IDOR: UserB read UserA goal. Status={getB.status_code}"

        # UserB PUT by id: 404
        putB = client.put(
            f"/api/goals/{goalA_id}",
            headers=authB["headers"],
            json={"title": "HACKED", "status": "active"},
        )
        assert (
            putB.status_code == 404
        ), f"IDOR: UserB modified UserA goal. Status={putB.status_code}"

        # UserB DELETE by id: 404
        delB = client.delete(f"/api/goals/{goalA_id}", headers=authB["headers"])
        assert (
            delB.status_code == 404
        ), f"IDOR: UserB deleted UserA goal. Status={delB.status_code}"

    def test_user_b_cannot_read_user_a_session_messages(self, client, db_session):
        """UserB GET/DELETE /api/sessions/{UserA_session_id}[/messages] -> 404."""
        authA = _register_login(client, "sess_userA", "Pass123!")
        authB = _register_login(client, "sess_userB", "Pass123!")

        # UserA creates a session
        createA = client.post(
            "/api/sessions/",
            headers=authA["headers"],
            json={"title": "UserA Private Session"},
        )
        assert createA.status_code in (200, 201)
        sessionA_id = createA.json()["id"]

        # UserB lists sessions: only UserB's own (empty)
        listB = client.get("/api/sessions/", headers=authB["headers"])
        assert listB.status_code == 200
        assert all(s["id"] != sessionA_id for s in listB.json())

        # UserB attempts to read UserA's messages directly: 404
        msgsB = client.get(
            f"/api/sessions/{sessionA_id}/messages",
            headers=authB["headers"],
        )
        assert (
            msgsB.status_code == 404
        ), f"IDOR! UserB read messages of UserA session. Status={msgsB.status_code}"

        # UserB attempts to delete UserA's session: 404
        delB = client.delete(
            f"/api/sessions/{sessionA_id}",
            headers=authB["headers"],
        )
        assert (
            delB.status_code == 404
        ), f"IDOR! UserB deleted UserA session. Status={delB.status_code}"


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Admin authorization matrix
# ═══════════════════════════════════════════════════════════════════════════════


class TestAdminAuthMatrix:
    def test_guest_to_admin_returns_200_limited_summary(self, client):
        """No token -> GET /api/admin/stats = 200 with public summary data."""
        res = client.get("/api/admin/stats")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert data.get("is_admin") is False
        assert "total_users" in data
        assert "summary_mode" in data

    def test_normal_user_to_admin_returns_200_limited_summary(self, client):
        """Non-admin user -> GET /api/admin/stats = 200 with reduced dataset."""
        auth = _register_login(client, "normal_user", "Pass123!")
        res = client.get("/api/admin/stats", headers=auth["headers"])
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert data.get("is_admin") is False
        assert data.get("summary_mode") is True

    @patch("app.core.dependencies.auth.get_settings")
    def test_admin_user_to_admin_returns_200_with_full_details(
        self, mock_settings, client
    ):
        """Admin-whitelisted user -> GET /api/admin/stats = 200 + full JSON body."""
        from app.core.config import Settings

        s = Settings()
        s.ADMIN_USERNAMES = "the_admin"
        mock_settings.return_value = s

        # Register the admin user
        client.post(
            "/api/auth/register",
            json={"username": "the_admin", "password": "Pass123!"},
        )
        login = client.post(
            "/api/auth/login",
            data={"username": "the_admin", "password": "Pass123!"},
        )
        admin_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        res = client.get("/api/admin/stats", headers=admin_headers)
        assert (
            res.status_code == 200
        ), f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("is_admin") is True
        assert data.get("summary_mode") is False
        for field in (
            "total_users",
            "total_sessions",
            "total_projects",
            "total_applications",
            "recent_users",
        ):
            assert field in data, f"Missing admin field: {field}"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Redis-unavailable graceful degradation
# ═══════════════════════════════════════════════════════════════════════════════


class TestRedisUnavailable:
    def test_health_endpoint_still_returns_200_when_redis_down(self, client):
        """With Redis client mocked unavailable, /api/health still returns 200
        with degraded redis status."""
        # Make cache.redis_client be None (like connection failed)
        with patch("app.core.cache.cache") as mock_cache:
            mock_cache.redis_client = None  # Simulate Redis down / not connected
            # Preserve connect/close as async no-ops so lifespan works
            mock_cache.connect = MagicMock()
            mock_cache.close = MagicMock()

            res = client.get("/api/health")
            assert (
                res.status_code == 200
            ), f"Health crashed! {res.status_code}: {res.text}"
            body = res.json()
            assert "status" in body
            components = body.get("components", {})
            if "redis" in components:
                rstatus = components["redis"].get("status", "ok")
                assert rstatus in (
                    "unavailable",
                    "error",
                ), f"Expected redis unavailable/error when client is None, got: {rstatus}"
            assert components.get("api", {}).get("status") == "ok"

    def test_protected_profile_endpoint_works_without_redis(self, client, db_session):
        """Profile (DB-backed protected endpoint) works even when Redis raises."""
        with patch("app.core.cache.cache") as mock_cache:
            mock_cache.redis_client = None
            mock_cache.connect = MagicMock()
            mock_cache.close = MagicMock()

            auth = _register_login(client, "redisless_user", "Pass123!")

            # Update profile
            patch_res = client.patch(
                "/api/profile",
                headers=auth["headers"],
                json={"target_role": "Software Engineer"},
            )
            assert (
                patch_res.status_code == 200
            ), f"Profile update failed with Redis down: {patch_res.text}"

            # Get profile back
            get = client.get("/api/profile", headers=auth["headers"])
            assert get.status_code == 200
            assert get.json().get("target_role") == "Software Engineer"
