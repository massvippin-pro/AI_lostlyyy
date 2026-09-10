"""Academic AI Heuristic Matcher and Intelligent Agent engine."""

from typing import List, Optional
from app.models.report import Report
from app.schemas.report import ReportResponse
from app.schemas.matching import CandidateMatch, FactorScores
from app.ai.similarity import (
    calculate_category_similarity,
    calculate_color_similarity,
    calculate_location_similarity,
    calculate_description_similarity,
)
from app.ai.scoring import calculate_time_score, calculate_overall_score
from app.ai.decision import classify_decision
from app.ai.ranking import rank_candidates
from app.services.explanation_service import ExplanationService


class InvalidComparisonError(ValueError):
    """Raised when comparing reports of identical type (LOST vs LOST or FOUND vs FOUND)."""
    pass


class HeuristicMatcher:
    """
    Intelligent Agent Heuristic Matching Engine.
    Evaluates candidate reports against a source report using a multi-factor weighted
    heuristic model, confidence-aware decision classification, and explainability breakdown.
    """

    def __init__(self):
        self.explanation_service = ExplanationService()

    def evaluate_pair(self, source: Report, candidate: Report) -> CandidateMatch:
        """
        Evaluate a single (source, candidate) pair.
        Enforces opposite report types (LOST vs FOUND).
        """
        if source.type == candidate.type:
            raise InvalidComparisonError(
                f"Cannot match report of type {source.type} against another report of type {candidate.type}. "
                "Matching requires opposite report types (LOST vs FOUND)."
            )

        # Determine chronology: identify lost event vs found event
        if source.type == "LOST":
            lost_time = source.date_time
            found_time = candidate.date_time
        else:
            lost_time = candidate.date_time
            found_time = source.date_time

        # 1. Category Score (Weight: 20%)
        category_score = calculate_category_similarity(source.category, candidate.category)

        # 2. Color Score (Weight: 15%)
        color_score, color_missing = calculate_color_similarity(source.color, candidate.color)

        # 3. Location Score (Weight: 20%)
        location_score = calculate_location_similarity(source.location, candidate.location)

        # 4. Time Score (Weight: 20%)
        time_score, time_reason, time_penalty = calculate_time_score(lost_time, found_time)

        # 5. Description Score (Weight: 25%)
        description_score = calculate_description_similarity(source.description, candidate.description)

        # Aggregate weighted overall score (0.0 to 100.0)
        overall_score = calculate_overall_score(
            category_score=category_score,
            color_score=color_score,
            location_score=location_score,
            time_score=time_score,
            description_score=description_score,
        )

        # Classify decision with confidence-aware abstention
        decision, abstention_note = classify_decision(
            score=overall_score,
            category_score=category_score,
            time_score=time_score,
            location_score=location_score,
            description_score=description_score,
        )

        # Factor scores schema
        factors = FactorScores(
            category=round(category_score, 4),
            color=round(color_score, 4),
            location=round(location_score, 4),
            time=round(time_score, 4),
            description=round(description_score, 4),
        )

        # Explainable reasoning
        explanation = self.explanation_service.generate_explanation(
            decision=decision,
            factors=factors,
            source_cat=source.category,
            cand_cat=candidate.category,
            source_color=source.color,
            cand_color=candidate.color,
            color_missing=color_missing,
            source_loc=source.location,
            cand_loc=candidate.location,
            time_reason=time_reason,
            time_penalty=time_penalty,
            source_desc=source.description,
            cand_desc=candidate.description,
            abstention_note=abstention_note,
        )

        return CandidateMatch(
            candidate_report=ReportResponse.model_validate(candidate),
            overall_score=overall_score,
            decision=decision,
            factors=factors,
            explanation=explanation,
        )

    def match(
        self,
        source: Report,
        candidates: List[Report],
        limit: int = 10,
        min_score: Optional[float] = None,
    ) -> List[CandidateMatch]:
        """
        Intelligent Agent workflow:
        1. Filters opposite-type candidates.
        2. Evaluates compatibility for each candidate.
        3. Ranks candidates descending by score.
        4. Returns top matches up to limit.
        """
        evaluated: List[CandidateMatch] = []

        for candidate in candidates:
            # Skip invalid candidates with matching types
            if candidate.type == source.type or candidate.id == source.id:
                continue

            match_result = self.evaluate_pair(source, candidate)
            evaluated.append(match_result)

        return rank_candidates(evaluated, limit=limit, min_score=min_score)
