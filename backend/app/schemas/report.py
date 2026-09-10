"""Pydantic schemas for Report validation, creation, update, and representation."""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.utils.enums import ReportType
from app.utils.dates import is_future_datetime, now_utc


class ReportBase(BaseModel):
    """Common fields shared between report models."""
    category: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Category name (e.g. Mobile Phone, Electronics, Wallet, Keys)",
        examples=["Mobile Phone"],
    )
    color: Optional[str] = Field(
        None,
        max_length=50,
        description="Primary color of the item (optional)",
        examples=["Black"],
    )
    location: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Campus location where the item was lost or found",
        examples=["Library"],
    )
    date_time: datetime = Field(
        ...,
        description="Timestamp when item was lost or found (ISO 8601)",
        examples=["2026-09-10T10:30:00Z"],
    )
    description: str = Field(
        ...,
        min_length=3,
        max_length=5000,
        description="Detailed free-text description of item characteristics",
        examples=["Black Samsung Galaxy S23 with a cracked screen and blue protective case."],
    )
    photo_url: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional future image URL (MVP text-only)",
    )

    @field_validator("category", "location", mode="before")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty or whitespace only")
        return v

    @field_validator("color", mode="before")
    @classmethod
    def validate_color_string(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if len(v) < 3:
                raise ValueError("Description must contain at least 3 characters")
        return v


class ReportCreate(ReportBase):
    """Payload for creating a new Lost or Found report."""
    type: ReportType = Field(
        ...,
        description="Report classification ('LOST' or 'FOUND')",
        examples=["LOST"],
    )

    @field_validator("date_time", mode="after")
    @classmethod
    def validate_reasonable_date(cls, v: datetime) -> datetime:
        if is_future_datetime(v, max_future_buffer_minutes=30):
            raise ValueError("Report date cannot be in the future")
        return v


class ReportUpdate(BaseModel):
    """Payload for updating an existing report (partial updates allowed)."""
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, min_length=1, max_length=100)
    date_time: Optional[datetime] = None
    description: Optional[str] = Field(None, min_length=3, max_length=5000)
    photo_url: Optional[str] = Field(None, max_length=500)

    @field_validator("category", "location", mode="before")
    @classmethod
    def clean_text_fields(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty")
        return v

    @field_validator("date_time", mode="after")
    @classmethod
    def validate_update_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None and is_future_datetime(v, max_future_buffer_minutes=30):
            raise ValueError("Report date cannot be in the future")
        return v


class ReportResponse(ReportBase):
    """Full representation of a report returned by the API."""
    id: uuid.UUID = Field(..., description="Unique UUID of the report")
    type: ReportType = Field(..., description="Report classification ('LOST' or 'FOUND')")
    created_at: datetime = Field(default_factory=now_utc, description="Report creation timestamp")
    updated_at: datetime = Field(default_factory=now_utc, description="Report last updated timestamp")

    model_config = ConfigDict(from_attributes=True)


class ReportFilterParams(BaseModel):
    """Query parameters for filtering reports."""
    type: Optional[ReportType] = None
    category: Optional[str] = None
    color: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)
