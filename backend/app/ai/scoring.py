"""Centralized scoring weights, time compatibility curve, and weighted score calculation."""

import math
from datetime import datetime
from typing import Tuple, Optional
from app.utils.dates import ensure_utc


class ScoringWeights:
    """
    Centralized academic AI scoring weights.
    Total = 1.00 (100%).
    Easily configurable for future tuning.
    """
    CATEGORY_WEIGHT: float = 0.20
    COLOR_WEIGHT: float = 0.15
    LOCATION_WEIGHT: float = 0.20
    TIME_WEIGHT: float = 0.20
    DESCRIPTION_WEIGHT: float = 0.25

    @classmethod
    def validate_weights(cls) -> bool:
        """Ensure all weights sum to exactly 1.0 within float precision."""
        total = (
            cls.CATEGORY_WEIGHT
            + cls.COLOR_WEIGHT
            + cls.LOCATION_WEIGHT
            + cls.TIME_WEIGHT
            + cls.DESCRIPTION_WEIGHT
        )
        return abs(total - 1.0) < 1e-6


def calculate_time_score(
    lost_time: datetime,
    found_time: datetime,
) -> Tuple[float, str, Optional[str]]:
    """
    Evaluate chronological compatibility between a LOST event and a FOUND event.
    Returns:
        Tuple of (score: float [0.0 - 1.0], explanation_reason: str, penalty_note: Optional[str])

    Chronology Rules:
    - Normal case: lost_time <= found_time (item lost first, then discovered).
    - Reverse case: found_time < lost_time.
      - Small inversion (<= 2 hrs): Mild penalty (0.60) due to human clock estimation errors.
      - Moderate inversion (2 hrs to 24 hrs): Severe penalty (0.20).
      - Severe inversion (> 24 hrs): Chronologically impossible for same event (0.00).
    """
    lost_utc = ensure_utc(lost_time)
    found_utc = ensure_utc(found_time)

    # Difference in hours: positive means found occurred AFTER lost
    diff_hours = (found_utc - lost_utc).total_seconds() / 3600.0

    # Handle Chronological Inversions (found before lost)
    if diff_hours < 0:
        abs_diff = abs(diff_hours)
        if abs_diff <= 2.0:
            return (
                0.60,
                f"Found time slightly precedes lost time by {abs_diff:.1f}h (within estimation tolerance)",
                "Minor chronological discrepancy: Found time is slightly earlier than reported lost time",
            )
        elif abs_diff <= 24.0:
            return (
                0.20,
                f"Found time precedes lost time by {abs_diff:.1f} hours",
                "Chronological inconsistency: Item was reported found before it was reported lost",
            )
        else:
            days = abs_diff / 24.0
            return (
                0.0,
                f"Chronologically incompatible: Item reported found {days:.1f} days before reported lost",
                "Severe chronological contradiction: Found event occurred days prior to lost event",
            )

    # Normal chronological order (item lost first, then found)
    if diff_hours <= 2.0:
        return 1.00, f"Reports are virtually concurrent (within {diff_hours:.1f}h)", None
    elif diff_hours <= 6.0:
        return 0.95, f"Reports occurred within {diff_hours:.1f} hours of each other", None
    elif diff_hours <= 24.0:
        return 0.90, f"Reports occurred on the same day ({diff_hours:.1f}h apart)", None
    elif diff_hours <= 72.0:
        days = diff_hours / 24.0
        return 0.80, f"Reports are within {days:.1f} days of each other", None
    elif diff_hours <= 168.0:
        days = diff_hours / 24.0
        return 0.65, f"Reports are within {days:.1f} days of each other", None
    elif diff_hours <= 336.0:
        days = diff_hours / 24.0
        return 0.50, f"Reports are separated by {days:.1f} days (two weeks)", "Moderate time gap between events"
    elif diff_hours <= 720.0:
        days = diff_hours / 24.0
        return 0.30, f"Reports are separated by {days:.1f} days (one month)", "Significant time gap between events"
    else:
        # Exponential decay beyond 30 days
        days = diff_hours / 24.0
        decay = max(0.05, 0.30 * math.exp(-0.001 * (diff_hours - 720.0)))
        return (
            round(decay, 4),
            f"Reports are separated by over a month ({days:.0f} days)",
            "Extensive time separation significantly reduces match likelihood",
        )


def calculate_overall_score(
    category_score: float,
    color_score: float,
    location_score: float,
    time_score: float,
    description_score: float,
) -> float:
    """
    Calculate composite compatibility score:
    overall_score = (
        category * 0.20 +
        color * 0.15 +
        location * 0.20 +
        time * 0.20 +
        description * 0.25
    ) * 100
    """
    raw = (
        category_score * ScoringWeights.CATEGORY_WEIGHT
        + color_score * ScoringWeights.COLOR_WEIGHT
        + location_score * ScoringWeights.LOCATION_WEIGHT
        + time_score * ScoringWeights.TIME_WEIGHT
        + description_score * ScoringWeights.DESCRIPTION_WEIGHT
    )
    return round(raw * 100.0, 2)
