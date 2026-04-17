def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "status" in response.json()
    assert "DraftMeet" in response.json()["status"]


def test_health(client):
    response = client.get("/health")
    assert response.status_code in (200, 503)  # 503 if Supabase unreachable in CI
