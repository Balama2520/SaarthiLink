def test_register_user(client):
    response = client.post(
        "/api/auth/register", json={"username": "testuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_user(client):
    # Register first
    client.post("/api/auth/register", json={"username": "loginuser", "password": "password123"})
    # Login with form-encoded body
    response = client.post(
        "/api/auth/login", data={"username": "loginuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_login_user_json(client):
    client.post("/api/auth/register", json={"username": "loginjson", "password": "password123"})
    response = client.post(
        "/api/auth/login", json={"username": "loginjson", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_usernames_are_normalized_and_case_insensitive(client):
    registered = client.post(
        "/api/auth/register",
        json={"username": "  CaseSensitiveUser  ", "password": "password123"},
    )
    assert registered.status_code == 200
    assert registered.json()["role"] == "user"
    assert registered.json()["user_id"] > 0

    duplicate = client.post(
        "/api/auth/register",
        json={"username": "casesensitiveuser", "password": "password123"},
    )
    assert duplicate.status_code == 400

    login = client.post(
        "/api/auth/login",
        json={"username": "CASESENSITIVEUSER", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["user_id"] == registered.json()["user_id"]


def test_current_account_returns_stable_identity_and_persisted_role(client):
    registration = client.post(
        "/api/auth/register",
        json={"username": "current-account", "password": "password123"},
    ).json()
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {registration['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": registration["user_id"],
        "username": "current-account",
        "role": "user",
        "target_role": None,
    }


def test_login_rejects_invalid_credentials_with_unauthorized(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "missing-user", "password": "incorrect"},
    )
    assert response.status_code == 401


def test_refresh_and_logout_invalidate_server_session(client):
    registered = client.post(
        "/api/auth/register",
        json={"username": "refresh-user", "password": "password123"},
    ).json()
    refresh_token = registered["refresh_token"]

    refreshed = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]
    rotated_token = refreshed.json()["refresh_token"]
    assert rotated_token != refresh_token

    # Replay protection: attempting to reuse old refresh_token must fail
    replay = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert replay.status_code == 401

    # Rotated token remains valid and rotates again
    refreshed_second = client.post("/api/auth/refresh", json={"refresh_token": rotated_token})
    assert refreshed_second.status_code == 200
    second_rotated = refreshed_second.json()["refresh_token"]
    assert second_rotated != rotated_token

    # Logging out rotated token invalidates session
    assert client.post("/api/auth/logout", json={"refresh_token": second_rotated}).status_code == 200
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": second_rotated}).status_code == 401
    )


def test_registration_rejects_passwords_beyond_bcrypt_limit(client):
    """Passwords must not silently truncate to bcrypt's 72-byte limit."""
    response = client.post(
        "/api/auth/register",
        json={"username": "longpassworduser", "password": "a" * 73},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Password must be 72 bytes or fewer"
