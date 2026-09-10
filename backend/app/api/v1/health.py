"""Health check endpoints for system and database connectivity."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings
from app.schemas.common import ApiResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="System Health Check",
    description="Check if the FastAPI service is running normally.",
)
def health_check() -> ApiResponse[dict]:
    """Return application uptime and service metadata."""
    return ApiResponse.success_response({
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    })


@router.get(
    "/health/db",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Database Connectivity Check",
    description="Verify active connection to PostgreSQL/Supabase database.",
)
def database_health_check(db: Session = Depends(get_db)) -> ApiResponse[dict]:
    """Execute a lightweight SELECT 1 check against the database."""
    try:
        db.execute(text("SELECT 1"))
        return ApiResponse.success_response({
            "status": "connected",
            "database": "postgresql" if not settings.is_sqlite else "sqlite",
        })
    except Exception as e:
        return ApiResponse.error_response(
            code="DATABASE_UNAVAILABLE",
            message="Database connectivity check failed",
            details=str(e),
        )
