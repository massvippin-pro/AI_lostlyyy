"""Tests for AI Heuristic Matching Engine covering all 10 core academic test cases."""

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.models.report import Report
from app.ai.heuristic_engine import HeuristicMatcher, InvalidComparisonError
from app.utils.enums import MatchDecision


@pytest.fixture
def base_time():
    return datetime(2026, 9, 10, 10, 0, 0, tzinfo=timezone.utc)


def test_case_1_high_score_match(base_time):
    """
    Test Case 1:
    Same category, same color, same location, close time, very similar description.
    Expected: HIGH SCORE (>= 80.0) / MATCH.
    """
    matcher = HeuristicMatcher()
    lost_report = Report(
        id=uuid.uuid4(),
        type="LOST",
        category="Mobile Phone",
        color="Black",
        location="Library",
        date_time=base_time,
        description="Black Samsung Galaxy phone with a cracked screen and blue case",
    )
    found_report = Report(
        id=uuid.uuid4(),
        type="FOUND",
        category="Mobile Phone",
        color="Black",
        location="Library",
        date_time=base_time + timedelta(hours=1),
        description="Samsung phone black color, screen has a crack, blue case attached",
    )

    result = matcher.evaluate_pair(lost_report, found_report)
    assert result.overall_score >= 80.0, f"Expected >= 80.0, got {result.overall_score}"
    assert result.decision == MatchDecision.MATCH
    assert result.factors.category == 1.0
    assert result.factors.color == 1.0
    assert result.factors.location == 1.0
    assert result.factors.time == 1.0
    assert len(result.explanation.reasons) >= 3


def test_case_2_lower_score(base_time):
    """
    Test Case 2:
    Same category, different color, different location, weak description.
    Expected: LOWER SCORE (< 80.0).
    """
    matcher = HeuristicMatcher()
    lost_report = Report(
        id=uuid.uuid4(),
        type="LOST",
        category="Mobile Phone",
        color="Black",
        location="Library",
        date_time=base_time,
        description="Black Samsung Galaxy phone with cracked screen",
    )
    found_report = Report(
        id=uuid.uuid4(),
        type="FOUND",
        category="Mobile Phone",
        color="White",
        location="Parking",
        date_time=base_time + timedelta(days=4),
        description="White mobile phone found near car park entrance",
    )

    result = matcher.evaluate_pair(lost_report, found_report)
    assert result.overall_score < 70.0
    assert result.decision in (MatchDecision.REVIEW, MatchDecision.NO_RELIABLE_MATCH)
    assert result.factors.color == 0.0
    assert result.factors.location == 0.05


def test_case_3_unrelated_items(base_time):
    """
    Test Case 3:
    Completely unrelated items.
    Expected: NO_RELIABLE_MATCH (< 50.0).
    """
    matcher = HeuristicMatcher()
    lost_report = Report(
        id=uuid.uuid4(),
        type="LOST",
        category="Mobile Phone",
        color="Black",
        location="Library",
        date_time=base_time,
        description="Black Samsung Galaxy phone with cracked screen",
    )
    found_report = Report(
        id=uuid.uuid4(),
        type="FOUND",
        category="Wallet",
        color="Red",
        location="Hostel",
        date_time=base_time + timedelta(days=10),
        description="Red leather wallet with some cash and student ID card",
    )

    result = matcher.evaluate_pair(lost_report, found_report)
    assert result.overall_score < 50.0
    assert result.decision == MatchDecision.NO_RELIABLE_MATCH


def test_case_4_moderately_similar_reports(base_time):
    """
    Test Case 4:
    Moderately similar reports.
    Expected: REVIEW (50.0 - 79.99).
    """
    matcher = HeuristicMatcher()
    lost_report = Report(
        id=uuid.uuid4(),
        type="LOST",
        category="Electronics",
        color="Black",
        location="Cafeteria",
        date_time=base_time,
        description="Black portable charger powerbank with USB cable",
    )
    found_report = Report(
        id=uuid.uuid4(),
        type="FOUND",
        category="Electronics",
        color="Black",
        location="Main Block",  # Adjacent location zone
        date_time=base_time + timedelta(days=2),
        description="Black electronic power battery pack",
    )

    result = matcher.evaluate_pair(lost_report, found_report)
    assert 50.0 <= result.overall_score < 80.0
    assert result.decision == MatchDecision.REVIEW


def test_case_5_lost_vs_lost_rejected(base_time):
    """
    Test Case 5:
    LOST compared against LOST.
    Expected: Invalid comparison / rejected.
    """
    matcher = HeuristicMatcher()
    lost_a = Report(id=uuid.uuid4(), type="LOST", category="Keys", location="Cafeteria", date_time=base_time, description="Keys")
    lost_b = Report(id=uuid.uuid4(), type="LOST", category="Keys", location="Cafeteria", date_time=base_time, description="Keys")

    with pytest.raises(InvalidComparisonError):
        matcher.evaluate_pair(lost_a, lost_b)


def test_case_6_found_vs_found_rejected(base_time):
    """
    Test Case 6:
    FOUND compared against FOUND.
    Expected: Invalid comparison / rejected.
    """
    matcher = HeuristicMatcher()
    found_a = Report(id=uuid.uuid4(), type="FOUND", category="Watch", location="Ground", date_time=base_time, description="Watch")
    found_b = Report(id=uuid.uuid4(), type="FOUND", category="Watch", location="Ground", date_time=base_time, description="Watch")

    with pytest.raises(InvalidComparisonError):
        matcher.evaluate_pair(found_a, found_b)


def test_case_7_missing_color_handled_gracefully(base_time):
    """
    Test Case 7:
    Missing color.
    Expected: System handles missing color gracefully (neutral baseline 0.50, transparent note).
    """
    matcher = HeuristicMatcher()
    lost_report = Report(
        id=uuid.uuid4(),
        type="LOST",
        category="Bag",
        color=None,  # Unspecified color
        location="Library",
        date_time=base_time,
        description="Blue backpack with laptop inside",
    )
    found_report = Report(
        id=uuid.uuid4(),
        type="FOUND",
        category="Bag",
        color="Blue",
        location="Library",
        date_time=base_time + timedelta(hours=2),
        description="Blue backpack with laptop inside",
    )

    result = matcher.evaluate_pair(lost_report, found_report)
    assert result.factors.color == 0.50
    assert any("neutral baseline" in note for note in result.explanation.notes)
    # The report can still score well overall without being penalized unfairly
    assert result.overall_score >= 80.0
    assert result.decision == MatchDecision.MATCH


def test_case_8_same_description_different_category(base_time):
    """
    Test Case 8:
    Same description but completely different category.
    Expected: NOT automatically MATCH (confidence-aware abstention).
    """
    matcher = HeuristicMatcher()
    shared_desc = "Black leather item with metal zipper and embossed logo"
    lost_report = Report(
        id=uuid.uuid4(),
        type="LOST",
        category="Wallet",
        color="Black",
        location="Library",
        date_time=base_time,
        description=shared_desc,
    )
    found_report = Report(
        id=uuid.uuid4(),
        type="FOUND",
        category="Laptop",  # Incompatible category
        color="Black",
        location="Library",
        date_time=base_time + timedelta(hours=1),
        description=shared_desc,
    )

    result = matcher.evaluate_pair(lost_report, found_report)
    assert result.decision != MatchDecision.MATCH
    assert result.factors.category == 0.0


def test_case_9_strong_metadata_weak_description(base_time):
    """
    Test Case 9:
    Strong category/color/location/time but weak description.
    Expected: Score reflects all factors proportionally.
    """
    matcher = HeuristicMatcher()
    lost_report = Report(
        id=uuid.uuid4(),
        type="LOST",
        category="Laptop",
        color="Silver",
        location="Library",
        date_time=base_time,
        description="Silver MacBook Air M2 13 inch with stickers",
    )
    found_report = Report(
        id=uuid.uuid4(),
        type="FOUND",
        category="Laptop",
        color="Silver",
        location="Library",
        date_time=base_time + timedelta(hours=1),
        description="Found device left on desk",  # Minimal description overlap
    )

    result = matcher.evaluate_pair(lost_report, found_report)
    assert result.factors.category == 1.0
    assert result.factors.color == 1.0
    assert result.factors.location == 1.0
    assert result.factors.time == 1.0
    assert result.factors.description < 0.20
    # Description is 25% of weight, remaining 75% is maxed -> score around 75-78 -> REVIEW
    assert 70.0 <= result.overall_score < 80.0
    assert result.decision == MatchDecision.REVIEW


def test_case_10_chronological_inconsistency(base_time):
    """
    Test Case 10:
    Found timestamp is significantly before lost timestamp.
    Expected: Chronological inconsistency handled correctly with severe penalty / NO_RELIABLE_MATCH.
    """
    matcher = HeuristicMatcher()
    lost_report = Report(
        id=uuid.uuid4(),
        type="LOST",
        category="Mobile Phone",
        color="Black",
        location="Library",
        date_time=base_time,  # Reported lost on Sept 10
        description="Black Samsung phone with cracked screen",
    )
    found_report = Report(
        id=uuid.uuid4(),
        type="FOUND",
        category="Mobile Phone",
        color="Black",
        location="Library",
        date_time=base_time - timedelta(days=3),  # Found 3 days BEFORE lost!
        description="Black Samsung phone with cracked screen",
    )

    result = matcher.evaluate_pair(lost_report, found_report)
    assert result.factors.time == 0.0
    assert result.decision in (MatchDecision.NO_RELIABLE_MATCH, MatchDecision.REVIEW)
    assert any("chronological" in neg.lower() for neg in result.explanation.negative_factors)


def test_matching_endpoint_and_candidate_ranking(client: TestClient):
    """Verify POST /api/v1/match endpoint returns candidates ranked in descending score order."""
    now = datetime.now(timezone.utc).isoformat()

    # 1. Create source LOST report
    lost_resp = client.post("/api/v1/reports", json={
        "type": "LOST",
        "category": "Mobile Phone",
        "color": "Black",
        "location": "Library",
        "date_time": now,
        "description": "Black Samsung phone with cracked screen and blue case",
    })
    lost_id = lost_resp.json()["data"]["id"]

    # 2. Create Candidate A (Strong Match)
    client.post("/api/v1/reports", json={
        "type": "FOUND",
        "category": "Mobile Phone",
        "color": "Black",
        "location": "Library",
        "date_time": now,
        "description": "Samsung black phone, cracked screen and blue cover",
    })

    # 3. Create Candidate B (Moderate Review)
    client.post("/api/v1/reports", json={
        "type": "FOUND",
        "category": "Mobile Phone",
        "color": "Black",
        "location": "Cafeteria",
        "date_time": now,
        "description": "Black phone found near tables",
    })

    # 4. Create Candidate C (Unrelated)
    client.post("/api/v1/reports", json={
        "type": "FOUND",
        "category": "Wallet",
        "color": "Red",
        "location": "Hostel",
        "date_time": now,
        "description": "Red coin wallet with receipts",
    })

    # 5. Execute Match API
    match_resp = client.post("/api/v1/match", json={
        "report_id": lost_id,
        "limit": 5,
    })
    assert match_resp.status_code == 200
    data = match_resp.json()["data"]

    matches = data["matches"]
    assert len(matches) >= 3

    # Verify descending ranking
    scores = [m["overall_score"] for m in matches]
    assert scores == sorted(scores, reverse=True), "Candidates must be ranked descending by score"

    # Candidate 1 should be MATCH
    assert matches[0]["decision"] == "MATCH"
    assert matches[0]["overall_score"] >= 80.0

    # Last candidate should be NO_RELIABLE_MATCH
    assert matches[-1]["decision"] == "NO_RELIABLE_MATCH"
    assert matches[-1]["overall_score"] < 50.0
