"""Tests for decision thresholds and confidence-aware abstention logic."""

from app.ai.decision import classify_decision
from app.utils.enums import MatchDecision


def test_decision_thresholds_clean():
    """Verify normal threshold classification."""
    # High score >= 80 with consistent attributes -> MATCH
    dec_match, note = classify_decision(
        score=88.5,
        category_score=1.0,
        time_score=0.9,
        location_score=1.0,
        description_score=0.85,
    )
    assert dec_match == MatchDecision.MATCH
    assert note is None

    # Moderate score 50-79.99 -> REVIEW
    dec_review, note = classify_decision(
        score=65.0,
        category_score=0.8,
        time_score=0.7,
        location_score=0.6,
        description_score=0.5,
    )
    assert dec_review == MatchDecision.REVIEW

    # Low score < 50 -> NO_RELIABLE_MATCH
    dec_none, _ = classify_decision(
        score=35.0,
        category_score=0.0,
        time_score=0.3,
        location_score=0.1,
        description_score=0.2,
    )
    assert dec_none == MatchDecision.NO_RELIABLE_MATCH


def test_confidence_abstention_rules():
    """Verify the AI does not force false positive matches on contradictory evidence."""
    # Contradiction 1: Incompatible category (e.g. Laptop vs Wallet)
    # Even if other overlaps pushed score to 81, system MUST NOT return MATCH
    dec, note = classify_decision(
        score=81.0,
        category_score=0.0,
        time_score=0.9,
        location_score=1.0,
        description_score=0.8,
    )
    assert dec == MatchDecision.REVIEW
    assert note is not None
    assert "incompatible item categories" in note.lower()

    # Contradiction 2: Chronological impossibility (found days before lost, time_score == 0.0)
    dec_time, note_time = classify_decision(
        score=80.0,
        category_score=1.0,
        time_score=0.0,
        location_score=1.0,
        description_score=0.8,
    )
    assert dec_time == MatchDecision.NO_RELIABLE_MATCH
    assert note_time is not None
    assert "chronological contradiction" in note_time.lower()
