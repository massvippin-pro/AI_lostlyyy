"""Deterministic similarity functions for Category, Color, Location, and Description."""

from typing import Optional, Tuple, Set
from app.ai.normalization import (
    normalize_category,
    normalize_color,
    normalize_location,
)
from app.utils.text import tokenize, clean_text
from app.utils.enums import StandardCategory


# Controlled taxonomy relationship matrix: category pairs with partial affinity
RELATED_CATEGORIES = {
    frozenset([StandardCategory.MOBILE_PHONE.value, StandardCategory.ELECTRONICS.value]): 0.80,
    frozenset([StandardCategory.LAPTOP.value, StandardCategory.ELECTRONICS.value]): 0.80,
    frozenset([StandardCategory.TABLET.value, StandardCategory.ELECTRONICS.value]): 0.80,
    frozenset([StandardCategory.TABLET.value, StandardCategory.MOBILE_PHONE.value]): 0.70,
    frozenset([StandardCategory.TABLET.value, StandardCategory.LAPTOP.value]): 0.70,
    frozenset([StandardCategory.WATCH.value, StandardCategory.ELECTRONICS.value]): 0.75,
    frozenset([StandardCategory.WATCH.value, StandardCategory.ACCESSORY.value]): 0.70,
    frozenset([StandardCategory.ID_CARD.value, StandardCategory.DOCUMENT.value]): 0.85,
    frozenset([StandardCategory.WALLET.value, StandardCategory.ACCESSORY.value]): 0.75,
    frozenset([StandardCategory.BAG.value, StandardCategory.ACCESSORY.value]): 0.70,
    frozenset([StandardCategory.BOOK.value, StandardCategory.DOCUMENT.value]): 0.65,
}

# Related color affinities (e.g. silver and gray, or close hues)
RELATED_COLORS = {
    frozenset(["gray", "silver"]): 0.85,
    frozenset(["black", "gray"]): 0.60,
    frozenset(["white", "silver"]): 0.70,
    frozenset(["gold", "yellow"]): 0.75,
    frozenset(["blue", "navy"]): 0.90,
    frozenset(["brown", "tan"]): 0.75,
    frozenset(["red", "maroon"]): 0.85,
    frozenset(["pink", "rose gold"]): 0.85,
}

# Related / adjacent campus location zones
RELATED_LOCATIONS = {
    frozenset(["LIBRARY", "CLASSROOM"]): 0.60,
    frozenset(["CAFETERIA", "MAIN_BLOCK"]): 0.60,
    frozenset(["LAB", "MAIN_BLOCK"]): 0.70,
    frozenset(["AUDITORIUM", "MAIN_BLOCK"]): 0.65,
    frozenset(["GROUND", "HOSTEL"]): 0.50,
}


def calculate_category_similarity(raw_cat_a: str, raw_cat_b: str) -> float:
    """
    Calculate normalized category similarity between two reports.
    Returns:
        1.0 for exact canonical match
        0.65 - 0.85 for taxonomically related categories
        0.25 for unclassified 'OTHER' category
        0.0 for distinctly incompatible categories
    """
    cat_a = normalize_category(raw_cat_a)
    cat_b = normalize_category(raw_cat_b)

    if cat_a == cat_b:
        return 1.0

    pair = frozenset([cat_a, cat_b])
    if pair in RELATED_CATEGORIES:
        return RELATED_CATEGORIES[pair]

    if cat_a == StandardCategory.OTHER.value or cat_b == StandardCategory.OTHER.value:
        return 0.25

    return 0.0


def calculate_color_similarity(raw_color_a: Optional[str], raw_color_b: Optional[str]) -> Tuple[float, bool]:
    """
    Calculate color compatibility score.
    Returns:
        Tuple of (score, is_missing_flag)
        If one or both colors are absent: (0.50, True) - neutral baseline
        If exact normalized match: (1.0, False)
        If related color family: (0.60 - 0.90, False)
        If distinct colors: (0.0, False)
    """
    col_a = normalize_color(raw_color_a)
    col_b = normalize_color(raw_color_b)

    # Missing data handling: Neutral baseline (0.50) with transparent notice
    if not col_a or not col_b:
        return 0.50, True

    if col_a == col_b:
        return 1.0, False

    pair = frozenset([col_a, col_b])
    if pair in RELATED_COLORS:
        return RELATED_COLORS[pair], False

    return 0.0, False


def calculate_location_similarity(raw_loc_a: str, raw_loc_b: str) -> float:
    """
    Calculate campus location compatibility.
    Does NOT fabricate GPS coordinates without hardware.
    Returns:
        1.0 for same campus zone
        0.50 - 0.70 for adjacent / related campus zones
        0.05 baseline for different campus areas
    """
    loc_a = normalize_location(raw_loc_a)
    loc_b = normalize_location(raw_loc_b)

    if loc_a == loc_b:
        return 1.0

    pair = frozenset([loc_a, loc_b])
    if pair in RELATED_LOCATIONS:
        return RELATED_LOCATIONS[pair]

    return 0.05


def _stem_word(word: str) -> str:
    """Lightweight deterministic suffix stripping for common variations."""
    for suffix in ("ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) > len(suffix) + 2:
            return word[: -len(suffix)]
    return word


def calculate_description_similarity(desc_a: str, desc_b: str) -> float:
    """
    Deterministic NLP text similarity offline without LLM.
    Uses tokenization, stopword removal, stemming, and Sørensen–Dice / Jaccard overlap.
    Returns:
        float between 0.0 and 1.0
    """
    tokens_a = [_stem_word(w) for w in tokenize(desc_a, remove_stopwords=True)]
    tokens_b = [_stem_word(w) for w in tokenize(desc_b, remove_stopwords=True)]

    set_a: Set[str] = set(tokens_a)
    set_b: Set[str] = set(tokens_b)

    if not set_a or not set_b:
        # Fallback to character/raw token overlap if all words were stopwords
        raw_a = set(clean_text(desc_a).split())
        raw_b = set(clean_text(desc_b).split())
        if not raw_a or not raw_b:
            return 0.0
        overlap = len(raw_a & raw_b)
        return min(1.0, (2.0 * overlap) / (len(raw_a) + len(raw_b)))

    # Compute intersection of stemmed distinctive tokens
    intersection = set_a & set_b
    if not intersection:
        return 0.0

    # Sørensen–Dice coefficient gives balanced weight to shared distinctive traits
    dice = (2.0 * len(intersection)) / (len(set_a) + len(set_b))

    # Jaccard index
    union = set_a | set_b
    jaccard = len(intersection) / len(union) if union else 0.0

    # Composite text score
    score = 0.70 * dice + 0.30 * jaccard
    return min(1.0, max(0.0, round(score, 4)))
