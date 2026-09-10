"""Pydantic schemas for AI heuristic matching requests, scores, and explanations."""

import uuid
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.report import ReportResponse
from app.utils.enums import MatchDecision


class FactorScores(BaseModel):
    """Normalized 0.0 to 1.0 sub-scores across all evaluation factors."""
    category: float = Field(..., ge=0.0, le=1.0, description="Category similarity score (Weight: 20%)")
    color: float = Field(..., ge=0.0, le=1.0, description="Color compatibility score (Weight: 15%)")
    location: float = Field(..., ge=0.0, le=1.0, description="Location proximity score (Weight: 20%)")
    time: float = Field(..., ge=0.0, le=1.0, description="Chronological compatibility score (Weight: 20%)")
    description: float = Field(..., ge=0.0, le=1.0, description="NLP text similarity score (Weight: 25%)")


class ExplanationDetail(BaseModel):
    """Transparent human-readable explanation of matching score."""
    summary: str = Field(..., description="High-level evaluation conclusion")
    reasons: List[str] = Field(default_factory=list, description="Positive evidence supporting compatibility")
    negative_factors: List[str] = Field(default_factory=list, description="Negative evidence or penalties")
    notes: List[str] = Field(default_factory=list, description="Information notices, e.g. missing attributes")


class CandidateMatch(BaseModel):
    """Evaluated candidate report with full score decomposition and explanation."""
    candidate_report: ReportResponse = Field(..., description="The candidate Found/Lost report evaluated")
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Weighted composite score (0 to 100)")
    decision: MatchDecision = Field(..., description="AI decision: MATCH (>=80), REVIEW (50-79.9), NO_RELIABLE_MATCH (<50)")
    factors: FactorScores = Field(..., description="Individual factor scores (0.0 to 1.0)")
    explanation: ExplanationDetail = Field(..., description="Explainable AI reasoning breakdown")


class MatchRequest(BaseModel):
    """Request payload to initiate AI matching against a source report."""
    report_id: uuid.UUID = Field(..., description="UUID of the Lost or Found report to find matches for")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of candidate matches to return")
    min_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Optional minimum score cutoff")


class MatchResponse(BaseModel):
    """Complete ranked response from the AI matching engine."""
    source_report: ReportResponse = Field(..., description="The query report being matched")
    candidates_evaluated: int = Field(..., description="Total candidate reports scored")
    total_matches_returned: int = Field(..., description="Number of matches returned after ranking and filtering")
    matches: List[CandidateMatch] = Field(default_factory=list, description="Ranked list of candidate matches")
