"""Repository for PostgreSQL/Supabase database operations on Reports."""

import uuid
from typing import List, Optional
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import Session
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportUpdate, ReportFilterParams
from app.utils.dates import ensure_utc, now_utc
from app.core.logging import logger


class ReportRepository:
    """Encapsulates all database operations for the Report model using SQLAlchemy 2.0."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: ReportCreate) -> Report:
        """Persist a new Report entity."""
        report = Report(
            id=uuid.uuid4(),
            type=data.type.value,
            category=data.category,
            color=data.color,
            location=data.location,
            date_time=ensure_utc(data.date_time),
            description=data.description,
            photo_url=data.photo_url,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def get_by_id(self, report_id: uuid.UUID) -> Optional[Report]:
        """Find a report by its UUID primary key."""
        stmt = select(Report).where(Report.id == report_id)
        return self.db.scalars(stmt).first()

    def list(self, filters: ReportFilterParams) -> List[Report]:
        """Retrieve reports matching optional query filters with pagination."""
        stmt = select(Report)
        conditions = []

        if filters.type:
            conditions.append(Report.type == filters.type.value)
        if filters.category:
            conditions.append(Report.category.ilike(f"%{filters.category.strip()}%"))
        if filters.color:
            conditions.append(Report.color.ilike(f"%{filters.color.strip()}%"))
        if filters.location:
            conditions.append(Report.location.ilike(f"%{filters.location.strip()}%"))
        if filters.start_date:
            conditions.append(Report.date_time >= ensure_utc(filters.start_date))
        if filters.end_date:
            conditions.append(Report.date_time <= ensure_utc(filters.end_date))

        if conditions:
            stmt = stmt.where(and_(*conditions))

        stmt = stmt.order_by(desc(Report.created_at)).offset(filters.offset).limit(filters.limit)
        return list(self.db.scalars(stmt).all())

    def get_candidates_for_type(self, target_type: str) -> List[Report]:
        """
        Retrieve all reports of the candidate type.
        (e.g., if source is 'LOST', retrieve all 'FOUND' reports).
        """
        stmt = (
            select(Report)
            .where(Report.type == target_type)
            .order_by(desc(Report.date_time))
        )
        return list(self.db.scalars(stmt).all())

    def update(self, report: Report, update_data: ReportUpdate) -> Report:
        """Apply partial updates to an existing report."""
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if field == "date_time" and value is not None:
                value = ensure_utc(value)
            setattr(report, field, value)

        report.updated_at = now_utc()
        self.db.commit()
        self.db.refresh(report)
        return report

    def delete(self, report: Report) -> None:
        """Delete a report from the database."""
        self.db.delete(report)
        self.db.commit()
