"""Tests for health check endpoints."""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """Verify system health endpoint returns status 200 and 'ok'."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"
    assert "version" in data["data"]


def test_database_health_check(client: TestClient):
    """Verify database ping endpoint succeeds."""
    response = client.get("/api/v1/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "connected"


def test_root_endpoint(client: TestClient):
    """Verify root endpoint returns API info and documentation links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["docs_url"] == "/docs"
