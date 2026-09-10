"""Decision thresholds and confidence-aware abstention logic."""

from typing import Tuple, List, Optional
from app.utils.enums import MatchDecision


# Strict decision thresholds
MATCH_THRESHOLD: float = 80.0
REVIEW_THRESHOLD: float = 50.0


def classify_decision(
    score: float,
    category_score: float,
    time_score: float,
    location_score: float,
    description_score: float,
) -> Tuple[MatchDecision, Optional[str]]:
    """
    Classify a compatibility score into MATCH, REVIEW, or NO_RELIABLE_MATCH.
    Applies confidence-aware abstention rules to prevent false positive matches
    when contradictory or physically impossible attributes are present.

    Returns:
        Tuple of (decision: MatchDecision, abstention_warning: Optional[str])
    """
    # Baseline threshold classification
    if score >= MATCH_THRESHOLD:
        initial_decision = MatchDecision.MATCH
    elif score >= REVIEW_THRESHOLD:
        initial_decision = MatchDecision.REVIEW
    else:
        initial_decision = MatchDecision.NO_RELIABLE_MATCH

    # --------------------------------------------------------------------------
    # Confidence-Aware Abstention / Gatekeeping Rules
    # --------------------------------------------------------------------------

    # Rule 1: Incompatible category cannot be a MATCH
    if initial_decision == MatchDecision.MATCH and category_score == 0.0:
        return (
            MatchDecision.REVIEW,
            "Abstention applied: Incompatible item categories prevent automatic MATCH despite other overlaps.",
        )

    # Rule 2: Incompatible chronology cannot be a MATCH
    if initial_decision == MatchDecision.MATCH and time_score == 0.0:
        return (
            MatchDecision.NO_RELIABLE_MATCH,
            "Abstention applied: Chronological contradiction (found prior to lost event) invalidates MATCH.",
        )

    # Rule 3: Single-factor inflation check
    # A MATCH must have multiple corroborated signals, not just high text overlap on empty metadata
    if initial_decision == MatchDecision.MATCH:
        strong_factors = sum(
            1 for s in [category_score, location_score, time_score, description_score] if s >= 0.60
        )
        if strong_factors < 2:
            return (
                MatchDecision.REVIEW,
                "Abstention applied: Insufficient corroborated signals across multiple factors to confirm MATCH.",
            )

    return initial_decision, None
