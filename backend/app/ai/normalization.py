"""Attribute normalization pipeline for deterministic heuristic matching."""

import re
from typing import Optional, Dict
from app.utils.enums import StandardCategory
from app.utils.text import clean_text

# Category alias mapping to canonical StandardCategory values
CATEGORY_ALIASES: Dict[str, StandardCategory] = {
    # Mobile Phones & Smart Devices
    "mobile": StandardCategory.MOBILE_PHONE,
    "phone": StandardCategory.MOBILE_PHONE,
    "mobile phone": StandardCategory.MOBILE_PHONE,
    "cellphone": StandardCategory.MOBILE_PHONE,
    "cell phone": StandardCategory.MOBILE_PHONE,
    "smartphone": StandardCategory.MOBILE_PHONE,
    "smart phone": StandardCategory.MOBILE_PHONE,
    "iphone": StandardCategory.MOBILE_PHONE,
    "android": StandardCategory.MOBILE_PHONE,
    "samsung phone": StandardCategory.MOBILE_PHONE,

    # Laptops & Computers
    "laptop": StandardCategory.LAPTOP,
    "macbook": StandardCategory.LAPTOP,
    "notebook": StandardCategory.LAPTOP,
    "thinkpad": StandardCategory.LAPTOP,
    "computer": StandardCategory.LAPTOP,

    # Tablets
    "tablet": StandardCategory.TABLET,
    "ipad": StandardCategory.TABLET,

    # Watches
    "watch": StandardCategory.WATCH,
    "smartwatch": StandardCategory.WATCH,
    "apple watch": StandardCategory.WATCH,
    "wrist watch": StandardCategory.WATCH,

    # Wallets & Money
    "wallet": StandardCategory.WALLET,
    "purse": StandardCategory.WALLET,
    "billfold": StandardCategory.WALLET,
    "money clip": StandardCategory.WALLET,

    # ID Cards & Badges
    "id": StandardCategory.ID_CARD,
    "id card": StandardCategory.ID_CARD,
    "student id": StandardCategory.ID_CARD,
    "college id": StandardCategory.ID_CARD,
    "campus card": StandardCategory.ID_CARD,
    "badge": StandardCategory.ID_CARD,

    # Keys
    "key": StandardCategory.KEYS,
    "keys": StandardCategory.KEYS,
    "keychain": StandardCategory.KEYS,
    "car key": StandardCategory.KEYS,
    "room key": StandardCategory.KEYS,

    # Bags
    "bag": StandardCategory.BAG,
    "backpack": StandardCategory.BAG,
    "tote": StandardCategory.BAG,
    "handbag": StandardCategory.BAG,
    "duffel": StandardCategory.BAG,
    "laptop bag": StandardCategory.BAG,

    # Books & Stationery
    "book": StandardCategory.BOOK,
    "textbook": StandardCategory.BOOK,
    "notebook book": StandardCategory.BOOK,
    "journal": StandardCategory.BOOK,
    "novel": StandardCategory.BOOK,

    # Clothing
    "clothing": StandardCategory.CLOTHING,
    "clothes": StandardCategory.CLOTHING,
    "jacket": StandardCategory.CLOTHING,
    "hoodie": StandardCategory.CLOTHING,
    "sweater": StandardCategory.CLOTHING,
    "coat": StandardCategory.CLOTHING,
    "shirt": StandardCategory.CLOTHING,
    "cap": StandardCategory.CLOTHING,
    "hat": StandardCategory.CLOTHING,

    # Accessories
    "accessory": StandardCategory.ACCESSORY,
    "glasses": StandardCategory.ACCESSORY,
    "sunglasses": StandardCategory.ACCESSORY,
    "spectacles": StandardCategory.ACCESSORY,
    "umbrella": StandardCategory.ACCESSORY,
    "water bottle": StandardCategory.ACCESSORY,
    "bottle": StandardCategory.ACCESSORY,

    # Documents
    "document": StandardCategory.DOCUMENT,
    "documents": StandardCategory.DOCUMENT,
    "passport": StandardCategory.DOCUMENT,
    "certificate": StandardCategory.DOCUMENT,
    "file": StandardCategory.DOCUMENT,
    "folder": StandardCategory.DOCUMENT,

    # Electronics & Peripherals
    "electronics": StandardCategory.ELECTRONICS,
    "electronic": StandardCategory.ELECTRONICS,
    "charger": StandardCategory.ELECTRONICS,
    "powerbank": StandardCategory.ELECTRONICS,
    "power bank": StandardCategory.ELECTRONICS,
    "headphones": StandardCategory.ELECTRONICS,
    "earphones": StandardCategory.ELECTRONICS,
    "airpods": StandardCategory.ELECTRONICS,
    "earbuds": StandardCategory.ELECTRONICS,
    "cable": StandardCategory.ELECTRONICS,
}

# Color normalization dictionary
COLOR_SYNONYMS: Dict[str, str] = {
    "grey": "gray",
    "charcoal": "gray",
    "silver": "silver",
    "navy": "blue",
    "dark blue": "blue",
    "light blue": "blue",
    "cyan": "blue",
    "sky blue": "blue",
    "maroon": "red",
    "crimson": "red",
    "scarlet": "red",
    "dark red": "red",
    "rose gold": "pink",
    "matte black": "black",
    "jet black": "black",
    "dark gray": "gray",
    "light gray": "gray",
    "golden": "gold",
    "beige": "tan",
    "khaki": "tan",
    "brown": "brown",
    "violet": "purple",
    "indigo": "purple",
}

# Campus location canonical normalization
LOCATION_ALIASES: Dict[str, str] = {
    "library": "LIBRARY",
    "central library": "LIBRARY",
    "main library": "LIBRARY",
    "reading room": "LIBRARY",
    "study hall": "LIBRARY",
    "lib": "LIBRARY",

    "cafeteria": "CAFETERIA",
    "canteen": "CAFETERIA",
    "food court": "CAFETERIA",
    "cafe": "CAFETERIA",
    "mess": "CAFETERIA",

    "main block": "MAIN_BLOCK",
    "academic block": "MAIN_BLOCK",
    "admin block": "MAIN_BLOCK",
    "administration": "MAIN_BLOCK",

    "hostel": "HOSTEL",
    "dorm": "HOSTEL",
    "dormitory": "HOSTEL",
    "boys hostel": "HOSTEL",
    "girls hostel": "HOSTEL",

    "parking": "PARKING",
    "parking lot": "PARKING",
    "bike stand": "PARKING",
    "car park": "PARKING",

    "lab": "LAB",
    "computer lab": "LAB",
    "science lab": "LAB",
    "chemistry lab": "LAB",
    "physics lab": "LAB",

    "auditorium": "AUDITORIUM",
    "seminar hall": "AUDITORIUM",
    "hall": "AUDITORIUM",

    "ground": "GROUND",
    "sports ground": "GROUND",
    "stadium": "GROUND",
    "field": "GROUND",
    "gym": "GROUND",
    "basketball court": "GROUND",

    "classroom": "CLASSROOM",
    "lecture hall": "CLASSROOM",
    "class": "CLASSROOM",
    "room": "CLASSROOM",
}


def normalize_category(raw_category: str) -> str:
    """Normalize user input category to canonical category name."""
    if not raw_category:
        return StandardCategory.OTHER.value

    cleaned = clean_text(raw_category)
    if cleaned in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[cleaned].value

    # Check substring tokens for partial matches
    tokens = cleaned.split()
    for token in tokens:
        if token in CATEGORY_ALIASES:
            return CATEGORY_ALIASES[token].value

    # Check exact enum match (e.g. "MOBILE_PHONE")
    upper_sanitized = re.sub(r"[^A-Z0-9_]", "_", raw_category.upper()).strip("_")
    for standard in StandardCategory:
        if standard.value == upper_sanitized:
            return standard.value

    # Fallback: uppercase sanitized representation
    return upper_sanitized if upper_sanitized else StandardCategory.OTHER.value


def normalize_color(raw_color: Optional[str]) -> Optional[str]:
    """Normalize raw color string into canonical color name."""
    if not raw_color:
        return None

    cleaned = clean_text(raw_color)
    if not cleaned:
        return None

    # Check direct synonym lookup
    if cleaned in COLOR_SYNONYMS:
        return COLOR_SYNONYMS[cleaned]

    # Look for known color words in multi-word input (e.g., "dark blue cover" -> "blue")
    known_colors = [
        "black", "white", "gray", "silver", "gold", "blue", "red", "green",
        "yellow", "orange", "purple", "pink", "brown", "tan"
    ]
    for color in known_colors:
        if color in cleaned:
            return color

    return cleaned


def normalize_location(raw_location: str) -> str:
    """Normalize campus location to canonical campus zone."""
    if not raw_location:
        return "OTHER"

    cleaned = clean_text(raw_location)
    if cleaned in LOCATION_ALIASES:
        return LOCATION_ALIASES[cleaned]

    # Check substring tokens for campus keywords
    for alias, canonical in LOCATION_ALIASES.items():
        if alias in cleaned:
            return canonical

    return re.sub(r"[^A-Z0-9_]", "_", raw_location.upper()).strip("_") or "OTHER"
