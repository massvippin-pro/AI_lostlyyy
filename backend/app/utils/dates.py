"""Date and time utilities with UTC timezone normalization."""

from datetime import datetime, timezone, timedelta
from typing import Optional


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure a datetime object is timezone-aware and set to UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def now_utc() -> datetime:
    """Return the current UTC datetime."""
    return datetime.now(timezone.utc)


def time_difference_hours(start: datetime, end: datetime) -> float:
    """
    Calculate the signed difference in hours between two timestamps (end - start).
    Positive value indicates 'end' occurred after 'start'.
    """
    start_utc = ensure_utc(start)
    end_utc = ensure_utc(end)
    diff = end_utc - start_utc
    return diff.total_seconds() / 3600.0


def is_future_datetime(dt: datetime, max_future_buffer_minutes: int = 15) -> bool:
    """
    Check if a datetime is set in the future beyond an acceptable buffer
    (buffer allows for minor client-server clock skew).
    """
    dt_utc = ensure_utc(dt)
    allowed_ceiling = now_utc() + timedelta(minutes=max_future_buffer_minutes)
    return dt_utc > allowed_ceiling
