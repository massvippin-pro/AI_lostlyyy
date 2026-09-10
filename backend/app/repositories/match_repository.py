"""Repository for persisting and retrieving match evaluations."""

import uuid
from typing import List
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.models.match import MatchRecord
from app.utils.dates import now_utc


class MatchRepository:
    """Encapsulates database operations for persisting match history."""

    def __init__(self, db: Session):
        self.db = db

    def save(
        self,
        source_report_id: uuid.UUID,
        candidate_report_id: uuid.UUID,
        score: float,
        decision: str,
        factor_scores: dict,
        explanation: dict,
    ) -> MatchRecord:
        """Persist an audit record of a match calculation."""
        record = MatchRecord(
            id=uuid.uuid4(),
            source_report_id=source_report_id,
            candidate_report_id=candidate_report_id,
            score=round(score, 2),
            decision=decision,
            factor_scores=factor_scores,
            explanation=explanation,
            created_at=now_utc(),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_by_source_report_id(self, source_report_id: uuid.UUID, limit: int = 10) -> List[MatchRecord]:
        """Fetch previously calculated matches for a specific report."""
        stmt = (
            select(MatchRecord)
            .where(MatchRecord.source_report_id == source_report_id)
            .order_by(desc(MatchRecord.score))
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
