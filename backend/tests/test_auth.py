def test_register_user(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_user(client):
    # Register first
    client.post(
        "/api/auth/register",
        json={"username": "loginuser", "password": "password123"}
    )
    # Login with form-encoded body
    response = client.post(
        "/api/auth/login",
        data={"username": "loginuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_login_user_json(client):
    client.post(
        "/api/auth/register",
        json={"username": "loginjson", "password": "password123"}
    )
    response = client.post(
        "/api/auth/login",
        json={"username": "loginjson", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


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

    assert client.post("/api/auth/logout", json={"refresh_token": refresh_token}).status_code == 200
    assert client.post("/api/auth/refresh", json={"refresh_token": refresh_token}).status_code == 401


def test_registration_rejects_passwords_beyond_bcrypt_limit(client):
    """Passwords must not silently truncate to bcrypt's 72-byte limit."""
    response = client.post(
        "/api/auth/register",
        json={"username": "longpassworduser", "password": "a" * 73},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Password must be 72 bytes or fewer"
