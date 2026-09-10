"""SQLAlchemy 2.0 model for Match auditing and historical records."""

import uuid
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import Float, String, DateTime, Uuid, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.utils.dates import now_utc


class MatchRecord(Base):
    """
    Optional historical record of match evaluation between a source report
    and a candidate report, persisting scores, decision, and factor breakdowns.
    """
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    source_report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    candidate_report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Overall compatibility score (0.0 to 100.0)",
    )

    decision: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        doc="'MATCH', 'REVIEW', or 'NO_RELIABLE_MATCH'",
    )

    factor_scores: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        doc="Normalized 0.0-1.0 sub-scores for category, color, location, time, description",
    )

    explanation: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        doc="Generated explanation summary and factor breakdown reasons",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<MatchRecord id={self.id} score={self.score} decision={self.decision}>"
