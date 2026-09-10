"""API v1 endpoints for AI Heuristic Matching Engine."""

import uuid
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.matching_service import MatchingService
from app.schemas.common import ApiResponse
from app.schemas.matching import MatchRequest, MatchResponse

router = APIRouter()


@router.post(
    "/match",
    response_model=ApiResponse[MatchResponse],
    status_code=status.HTTP_200_OK,
    summary="Run AI Heuristic Matching for a Report",
    description=(
        "Executes the Intelligent Agent matching workflow: identifies report type, "
        "retrieves opposite-type candidate reports, evaluates multi-factor compatibility "
        "(Category 20%, Color 15%, Location 20%, Time 20%, Description 25%), "
        "ranks candidates, applies confidence thresholds, and provides explainable reasoning."
    ),
)
def run_match(
    payload: MatchRequest,
    db: Session = Depends(get_db),
) -> ApiResponse[MatchResponse]:
    """Execute AI matching for a source report."""
    service = MatchingService(db)
    result = service.run_matching(payload)
    return ApiResponse.success_response(result)


@router.get(
    "/matches/{report_id}",
    response_model=ApiResponse[MatchResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Ranked Matches for a Report",
    description="Convenience GET endpoint to trigger candidate matching for a given report UUID.",
)
def get_matches_for_report(
    report_id: uuid.UUID,
    limit: int = Query(10, ge=1, le=50, description="Max candidate matches to return"),
    min_score: float = Query(None, ge=0.0, le=100.0, description="Minimum score cutoff"),
    db: Session = Depends(get_db),
) -> ApiResponse[MatchResponse]:
    """Trigger candidate matching via GET request."""
    service = MatchingService(db)
    request = MatchRequest(report_id=report_id, limit=limit, min_score=min_score)
    result = service.run_matching(request)
    return ApiResponse.success_response(result)
