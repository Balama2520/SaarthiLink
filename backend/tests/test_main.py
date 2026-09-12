def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    # Root endpoint returns service identity — not a legacy message field.
    # See app/main.py root() which was refactored in phase-1 cleanup.
    assert "status" in data
    assert data["status"] == "ok"
    assert "service" in data
    assert "Saarthi" in data["service"], "Root endpoint must identify the Saarthi AI service"

def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("ok", "degraded")
    assert "timestamp" in data
    assert "version" in data
    assert "components" in data
