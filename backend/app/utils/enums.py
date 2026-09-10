"""Domain enumerations for reports, categories, and AI match decisions."""

from enum import Enum


class ReportType(str, Enum):
    """Report type classification."""
    LOST = "LOST"
    FOUND = "FOUND"


class MatchDecision(str, Enum):
    """AI confidence-aware match decisions."""
    MATCH = "MATCH"
    REVIEW = "REVIEW"
    NO_RELIABLE_MATCH = "NO_RELIABLE_MATCH"


class StandardCategory(str, Enum):
    """Controlled vocabulary for report categories."""
    ELECTRONICS = "ELECTRONICS"
    MOBILE_PHONE = "MOBILE_PHONE"
    LAPTOP = "LAPTOP"
    TABLET = "TABLET"
    WATCH = "WATCH"
    WALLET = "WALLET"
    ID_CARD = "ID_CARD"
    KEYS = "KEYS"
    BAG = "BAG"
    BOOK = "BOOK"
    CLOTHING = "CLOTHING"
    ACCESSORY = "ACCESSORY"
    DOCUMENT = "DOCUMENT"
    OTHER = "OTHER"
