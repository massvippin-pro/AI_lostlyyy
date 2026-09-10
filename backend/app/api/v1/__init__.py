"""API v1 endpoints package."""

from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.reports import router as reports_router
from app.api.v1.matching import router as matching_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health_router, tags=["Health"])
api_v1_router.include_router(reports_router, prefix="/reports", tags=["Reports"])
api_v1_router.include_router(matching_router, tags=["AI Matching Engine"])

__all__ = ["api_v1_router"]
