"""Database repositories package."""

from app.repositories.report_repository import ReportRepository
from app.repositories.match_repository import MatchRepository

__all__ = ["ReportRepository", "MatchRepository"]
