"""Business logic service for report management."""

import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.report_repository import ReportRepository
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportFilterParams,
)
from app.models.report import Report


class ReportNotFoundError(Exception):
    """Raised when a requested report ID does not exist."""
    def __init__(self, report_id: uuid.UUID):
        super().__init__(f"Report with ID '{report_id}' was not found.")
        self.report_id = report_id


class ReportService:
    """Service layer managing reports business logic."""

    def __init__(self, db: Session):
        self.repo = ReportRepository(db)

    def create_report(self, data: ReportCreate) -> ReportResponse:
        """Create and persist a new report."""
        entity = self.repo.create(data)
        return ReportResponse.model_validate(entity)

    def get_report_entity(self, report_id: uuid.UUID) -> Report:
        """Retrieve the raw SQLAlchemy Report entity or raise ReportNotFoundError."""
        entity = self.repo.get_by_id(report_id)
        if not entity:
            raise ReportNotFoundError(report_id)
        return entity

    def get_report(self, report_id: uuid.UUID) -> ReportResponse:
        """Retrieve a single report by ID."""
        entity = self.get_report_entity(report_id)
        return ReportResponse.model_validate(entity)

    def list_reports(self, filters: ReportFilterParams) -> List[ReportResponse]:
        """List reports with filtering and pagination."""
        entities = self.repo.list(filters)
        return [ReportResponse.model_validate(e) for e in entities]

    def update_report(self, report_id: uuid.UUID, data: ReportUpdate) -> ReportResponse:
        """Apply partial updates to an existing report."""
        entity = self.get_report_entity(report_id)
        updated = self.repo.update(entity, data)
        return ReportResponse.model_validate(updated)

    def delete_report(self, report_id: uuid.UUID) -> None:
        """Delete an existing report."""
        entity = self.get_report_entity(report_id)
        self.repo.delete(entity)
