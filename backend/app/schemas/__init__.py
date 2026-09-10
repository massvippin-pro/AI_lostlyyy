"""Pydantic schemas package."""

from app.schemas.common import ApiResponse, ErrorDetail
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportFilterParams,
)
from app.schemas.matching import (
    FactorScores,
    ExplanationDetail,
    CandidateMatch,
    MatchRequest,
    MatchResponse,
)

__all__ = [
    "ApiResponse",
    "ErrorDetail",
    "ReportCreate",
    "ReportUpdate",
    "ReportResponse",
    "ReportFilterParams",
    "FactorScores",
    "ExplanationDetail",
    "CandidateMatch",
    "MatchRequest",
    "MatchResponse",
]
