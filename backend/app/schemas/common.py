"""Standardized response wrappers and error schemas."""

from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Structured error payload for API error responses."""
    code: str = Field(..., description="Machine-readable error code, e.g. REPORT_NOT_FOUND")
    message: str = Field(..., description="Human-readable explanation of the error")
    details: Optional[Any] = Field(None, description="Optional extra error context or field errors")


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard unified envelope for all API endpoints.
    Frontend apps (Next.js & Expo) rely on this consistent format.
    """
    success: bool = Field(..., description="Indicates if the operation succeeded")
    data: Optional[T] = Field(None, description="Response payload when success is True")
    error: Optional[ErrorDetail] = Field(None, description="Error details when success is False")

    @classmethod
    def success_response(cls, data: T) -> "ApiResponse[T]":
        return cls(success=True, data=data, error=None)

    @classmethod
    def error_response(cls, code: str, message: str, details: Optional[Any] = None) -> "ApiResponse[None]":
        return cls(
            success=False,
            data=None,
            error=ErrorDetail(code=code, message=message, details=details),
        )
