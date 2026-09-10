"""Candidate ranking and sorting module."""

from typing import List, Optional
from app.schemas.matching import CandidateMatch


def rank_candidates(
    candidates: List[CandidateMatch],
    limit: int = 10,
    min_score: Optional[float] = None,
) -> List[CandidateMatch]:
    """
    Rank candidate matches in descending order of overall score.
    Applies deterministic tie-breaking (description score, time score, category score).
    """
    # Filter by minimum score threshold if specified
    filtered = candidates
    if min_score is not None:
        filtered = [c for c in candidates if c.overall_score >= min_score]

    # Deterministic multi-key sorting
    ranked = sorted(
        filtered,
        key=lambda c: (
            c.overall_score,
            c.factors.description,
            c.factors.time,
            c.factors.category,
        ),
        reverse=True,
    )

    return ranked[:limit]
