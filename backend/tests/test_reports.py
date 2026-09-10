"""Tests for Report CRUD endpoints, validation, and error responses."""

import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient


def test_create_report_success(client: TestClient):
    """Verify creating valid LOST and FOUND reports."""
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "type": "LOST",
        "category": "Mobile Phone",
        "color": "Black",
        "location": "Library",
        "date_time": now,
        "description": "Black Samsung Galaxy S23 with a blue case",
    }
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["category"] == "Mobile Phone"
    assert data["data"]["type"] == "LOST"
    assert "id" in data["data"]


def test_create_report_validation_errors(client: TestClient):
    """Verify that invalid inputs are rejected with 422 Unprocessable Entity."""
    now = datetime.now(timezone.utc).isoformat()

    # 1. Description too short
    payload_short_desc = {
        "type": "LOST",
        "category": "Electronics",
        "location": "Library",
        "date_time": now,
        "description": "a",
    }
    resp = client.post("/api/v1/reports", json=payload_short_desc)
    assert resp.status_code == 422
    assert resp.json()["success"] is False
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    # 2. Future date beyond tolerance
    far_future = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    payload_future = {
        "type": "FOUND",
        "category": "Keys",
        "location": "Parking",
        "date_time": far_future,
        "description": "Set of Honda car keys",
    }
    resp_future = client.post("/api/v1/reports", json=payload_future)
    assert resp_future.status_code == 422


def test_list_and_filter_reports(client: TestClient):
    """Verify report listing and query filtering."""
    now = datetime.now(timezone.utc).isoformat()
    client.post("/api/v1/reports", json={
        "type": "LOST",
        "category": "Wallet",
        "location": "Cafeteria",
        "date_time": now,
        "description": "Brown leather wallet with ID cards",
    })
    client.post("/api/v1/reports", json={
        "type": "FOUND",
        "category": "Laptop",
        "location": "Lab",
        "date_time": now,
        "description": "Silver MacBook Air 13 inch",
    })

    # Filter by type=LOST
    resp_lost = client.get("/api/v1/reports?type=LOST")
    assert resp_lost.status_code == 200
    items = resp_lost.json()["data"]
    assert all(r["type"] == "LOST" for r in items)

    # Filter by category substring
    resp_cat = client.get("/api/v1/reports?category=Laptop")
    assert resp_cat.status_code == 200
    assert len(resp_cat.json()["data"]) >= 1


def test_get_update_and_delete_report(client: TestClient):
    """Verify retrieving, patching, and deleting an individual report."""
    now = datetime.now(timezone.utc).isoformat()
    create_resp = client.post("/api/v1/reports", json={
        "type": "FOUND",
        "category": "Bag",
        "location": "Auditorium",
        "date_time": now,
        "description": "Blue JanSport backpack left on seat 4B",
    })
    report_id = create_resp.json()["data"]["id"]

    # Retrieve
    get_resp = client.get(f"/api/v1/reports/{report_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == report_id

    # Update (PATCH)
    patch_resp = client.patch(f"/api/v1/reports/{report_id}", json={
        "description": "Blue JanSport backpack with a water bottle in side pocket",
    })
    assert patch_resp.status_code == 200
    assert "water bottle" in patch_resp.json()["data"]["description"]

    # Delete
    del_resp = client.delete(f"/api/v1/reports/{report_id}")
    assert del_resp.status_code == 200

    # Retrieve deleted -> 404
    get_del_resp = client.get(f"/api/v1/reports/{report_id}")
    assert get_del_resp.status_code == 404
    assert get_del_resp.json()["error"]["code"] == "REPORT_NOT_FOUND"
