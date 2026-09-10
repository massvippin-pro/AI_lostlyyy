"""SQLAlchemy 2.0 model for Lost and Found reports."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.utils.dates import now_utc


class Report(Base):
    """
    SQLAlchemy model representing a Lost or Found item report.
    PostgreSQL and Supabase compatible with indexed search columns.
    """
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )

    type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        index=True,
        doc="Report classification: 'LOST' or 'FOUND'",
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Normalized or standard category name",
    )

    color: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        doc="Primary color descriptor or None if unspecified",
    )

    location: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Campus building or landmark location",
    )

    date_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Reported timestamp when item was lost or found",
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Detailed free-text description of item characteristics",
    )

    photo_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        doc="Optional future photo storage URL (unused in text MVP)",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    def __init__(self, **kwargs):
        if "id" not in kwargs or kwargs["id"] is None:
            kwargs["id"] = uuid.uuid4()
        if "created_at" not in kwargs or kwargs["created_at"] is None:
            kwargs["created_at"] = now_utc()
        if "updated_at" not in kwargs or kwargs["updated_at"] is None:
            kwargs["updated_at"] = now_utc()
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<Report id={self.id} type={self.type} category={self.category} location={self.location}>"
