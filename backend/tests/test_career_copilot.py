def test_skill_gap_analysis_endpoint(client, auth_headers):
    response = client.post(
        "/api/career/skill-gap",
        headers=auth_headers,
        json={"target_role": "Software Engineer"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["target_role"] == "Software Engineer"
    assert "gaps" in data
    assert isinstance(data["gaps"], list)


def test_learning_plan_endpoint(client, auth_headers):
    response = client.post(
        "/api/career/learning-plan",
        headers=auth_headers,
        json={"target_role": "Data Analyst", "weeks": 4},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["target_role"] == "Data Analyst"
    assert "plan" in data
    assert isinstance(data["plan"], list)


def test_dashboard_summary_endpoint(client, auth_headers):
    response = client.get("/api/career/dashboard", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert "headline" in data
    assert "focus_areas" in data
    assert isinstance(data["focus_areas"], list)
