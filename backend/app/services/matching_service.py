"""Service layer coordinating intelligent agent matching workflow."""

import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.report_repository import ReportRepository
from app.repositories.match_repository import MatchRepository
from app.services.report_service import ReportNotFoundError
from app.ai.heuristic_engine import HeuristicMatcher
from app.schemas.matching import MatchRequest, MatchResponse, CandidateMatch
from app.schemas.report import ReportResponse
from app.core.logging import logger


class MatchingService:
    """
    Coordinates the end-to-end intelligent matching workflow:
    1. Fetches source report.
    2. Identifies target opposite report type (LOST -> FOUND or FOUND -> LOST).
    3. Retrieves candidate pool from database.
    4. Evaluates heuristic compatibility.
    5. Ranks and caps candidates.
    6. Persists audit records.
    7. Returns complete explainable response.
    """

    def __init__(self, db: Session):
        self.db = db
        self.report_repo = ReportRepository(db)
        self.match_repo = MatchRepository(db)
        self.matcher = HeuristicMatcher()

    def run_matching(self, request: MatchRequest) -> MatchResponse:
        """Execute on-demand heuristic matching for a given report ID."""
        source = self.report_repo.get_by_id(request.report_id)
        if not source:
            raise ReportNotFoundError(request.report_id)

        # Determine candidate pool type
        target_type = "FOUND" if source.type == "LOST" else "LOST"
        candidates = self.report_repo.get_candidates_for_type(target_type)

        logger.info(
            f"Matching agent running for report {source.id} ({source.type}). "
            f"Found {len(candidates)} candidate {target_type} reports."
        )

        # Execute heuristic matching
        ranked_matches: List[CandidateMatch] = self.matcher.match(
            source=source,
            candidates=candidates,
            limit=request.limit,
            min_score=request.min_score,
        )

        # Audit/persist top match records for analysis
        for match in ranked_matches:
            try:
                self.match_repo.save(
                    source_report_id=source.id,
                    candidate_report_id=match.candidate_report.id,
                    score=match.overall_score,
                    decision=match.decision.value,
                    factor_scores=match.factors.model_dump(),
                    explanation=match.explanation.model_dump(),
                )
            except Exception as e:
                # Do not fail matching request if audit persistence encounters issues
                logger.warning(f"Failed to record match audit: {e}")

        return MatchResponse(
            source_report=ReportResponse.model_validate(source),
            candidates_evaluated=len(candidates),
            total_matches_returned=len(ranked_matches),
            matches=ranked_matches,
        )
