"""API v1 endpoints for managing Lost and Found reports."""

import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.report_service import ReportService
from app.schemas.common import ApiResponse
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportFilterParams,
)
from app.utils.enums import ReportType

router = APIRouter()


@router.post(
    "",
    response_model=ApiResponse[ReportResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Lost or Found report",
    description="Submit a new report with item characteristics, campus location, and datetime.",
)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
) -> ApiResponse[ReportResponse]:
    """Create a new LOST or FOUND report."""
    service = ReportService(db)
    created = service.create_report(payload)
    return ApiResponse.success_response(created)


@router.get(
    "",
    response_model=ApiResponse[List[ReportResponse]],
    status_code=status.HTTP_200_OK,
    summary="List and filter reports",
    description="Retrieve reports filtered by type, category, location, color, or date range.",
)
def list_reports(
    type: Optional[ReportType] = Query(None, description="Filter by LOST or FOUND"),
    category: Optional[str] = Query(None, description="Filter by category substring"),
    color: Optional[str] = Query(None, description="Filter by color substring"),
    location: Optional[str] = Query(None, description="Filter by campus location substring"),
    start_date: Optional[datetime] = Query(None, description="Earliest datetime"),
    end_date: Optional[datetime] = Query(None, description="Latest datetime"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
) -> ApiResponse[List[ReportResponse]]:
    """Retrieve filtered list of reports."""
    filters = ReportFilterParams(
        type=type,
        category=category,
        color=color,
        location=location,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )
    service = ReportService(db)
    reports = service.list_reports(filters)
    return ApiResponse.success_response(reports)


@router.get(
    "/{report_id}",
    response_model=ApiResponse[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve a report by ID",
    description="Fetch full details for a specific report UUID.",
)
def get_report(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ApiResponse[ReportResponse]:
    """Retrieve report by UUID."""
    service = ReportService(db)
    report = service.get_report(report_id)
    return ApiResponse.success_response(report)


@router.patch(
    "/{report_id}",
    response_model=ApiResponse[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Update report details",
    description="Partially update fields on an existing report.",
)
def update_report(
    report_id: uuid.UUID,
    payload: ReportUpdate,
    db: Session = Depends(get_db),
) -> ApiResponse[ReportResponse]:
    """Update report attributes."""
    service = ReportService(db)
    updated = service.update_report(report_id, payload)
    return ApiResponse.success_response(updated)


@router.delete(
    "/{report_id}",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Delete a report",
    description="Remove a report from the system.",
)
def delete_report(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ApiResponse[dict]:
    """Delete report by UUID."""
    service = ReportService(db)
    service.delete_report(report_id)
    return ApiResponse.success_response({"deleted_id": str(report_id), "status": "deleted"})
