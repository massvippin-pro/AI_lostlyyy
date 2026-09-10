"""Tests for scoring weights, chronology curves, and overall weighted score."""

from datetime import datetime, timedelta, timezone
from app.ai.scoring import (
    ScoringWeights,
    calculate_time_score,
    calculate_overall_score,
)


def test_scoring_weights_configuration():
    """Verify that scoring weights are centrally declared and sum to exactly 1.0."""
    assert ScoringWeights.validate_weights() is True
    assert ScoringWeights.CATEGORY_WEIGHT == 0.20
    assert ScoringWeights.COLOR_WEIGHT == 0.15
    assert ScoringWeights.LOCATION_WEIGHT == 0.20
    assert ScoringWeights.TIME_WEIGHT == 0.20
    assert ScoringWeights.DESCRIPTION_WEIGHT == 0.25


def test_time_scoring_curve_and_chronology():
    """Verify chronological scoring curve and inversion penalties."""
    base_time = datetime(2026, 9, 10, 10, 0, 0, tzinfo=timezone.utc)

    # 1. Virtually concurrent (1 hour later)
    score, reason, penalty = calculate_time_score(base_time, base_time + timedelta(hours=1))
    assert score == 1.00
    assert penalty is None

    # 2. Same day (5 hours later)
    score, _, _ = calculate_time_score(base_time, base_time + timedelta(hours=5))
    assert score == 0.95

    # 3. Next day (20 hours later)
    score, _, _ = calculate_time_score(base_time, base_time + timedelta(hours=20))
    assert score == 0.90

    # 4. 2 days later (48 hours)
    score, _, _ = calculate_time_score(base_time, base_time + timedelta(days=2))
    assert score == 0.80

    # 5. Inversion: Found 1 hour BEFORE lost (minor human estimation margin)
    score_inv_minor, _, penalty = calculate_time_score(base_time, base_time - timedelta(hours=1))
    assert score_inv_minor == 0.60
    assert penalty is not None

    # 6. Inversion: Found 5 hours BEFORE lost (moderate inversion)
    score_inv_mod, _, penalty = calculate_time_score(base_time, base_time - timedelta(hours=5))
    assert score_inv_mod == 0.20

    # 7. Inversion: Found 2 days BEFORE lost (severe contradiction)
    score_inv_severe, _, penalty = calculate_time_score(base_time, base_time - timedelta(days=2))
    assert score_inv_severe == 0.00
    assert "contradiction" in penalty.lower()


def test_overall_weighted_score_calculation():
    """Verify weighted score calculation against academic reference formula."""
    # Worked example from user specification:
    # Category = 1.0 (20%)
    # Color = 1.0 (15%)
    # Location = 0.8 (20%)
    # Time = 0.9 (20%)
    # Description = 0.88 (25%)
    # Expected: (0.20 + 0.15 + 0.16 + 0.18 + 0.22) * 100 = 91.00
    overall = calculate_overall_score(
        category_score=1.0,
        color_score=1.0,
        location_score=0.8,
        time_score=0.9,
        description_score=0.88,
    )
    assert overall == 91.0
