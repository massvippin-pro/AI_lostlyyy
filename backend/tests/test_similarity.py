"""Tests for attribute normalization and similarity algorithms."""

from app.ai.normalization import (
    normalize_category,
    normalize_color,
    normalize_location,
)
from app.ai.similarity import (
    calculate_category_similarity,
    calculate_color_similarity,
    calculate_location_similarity,
    calculate_description_similarity,
)


def test_category_normalization_and_similarity():
    """Verify category normalization maps aliases and evaluates similarity correctly."""
    # Exact normalized match
    assert normalize_category("Mobile Phone") == "MOBILE_PHONE"
    assert normalize_category("iphone") == "MOBILE_PHONE"
    assert normalize_category("cell phone") == "MOBILE_PHONE"
    assert calculate_category_similarity("iphone", "Mobile Phone") == 1.0

    # Taxonomically related category
    sim_related = calculate_category_similarity("mobile", "electronics")
    assert sim_related == 0.80

    # Incompatible categories
    sim_different = calculate_category_similarity("mobile", "wallet")
    assert sim_different == 0.0


def test_color_normalization_and_similarity():
    """Verify color normalization handles synonyms and missing attributes."""
    # Synonyms
    assert normalize_color("grey") == "gray"
    assert normalize_color("dark blue") == "blue"

    score, missing = calculate_color_similarity("grey", "gray")
    assert score == 1.0
    assert missing is False

    # Related color tones
    score_related, _ = calculate_color_similarity("silver", "gray")
    assert score_related == 0.85

    # Completely distinct colors
    score_diff, _ = calculate_color_similarity("black", "red")
    assert score_diff == 0.0

    # Missing color (transparent neutral baseline)
    score_missing, is_missing = calculate_color_similarity(None, "black")
    assert score_missing == 0.50
    assert is_missing is True


def test_location_normalization_and_similarity():
    """Verify campus location matching."""
    assert normalize_location("Central Library") == "LIBRARY"
    assert normalize_location("reading room") == "LIBRARY"
    assert calculate_location_similarity("central library", "Library") == 1.0

    # Adjacent campus zones
    adj_score = calculate_location_similarity("Library", "Classroom")
    assert adj_score == 0.60

    # Distinct campus areas
    diff_score = calculate_location_similarity("Library", "Parking")
    assert diff_score == 0.05


def test_description_nlp_similarity():
    """Verify deterministic NLP description similarity without external LLMs."""
    # Exact prompt example:
    desc_lost = "black Samsung phone with cracked screen"
    desc_found = "Samsung black mobile, screen has crack"
    score = calculate_description_similarity(desc_lost, desc_found)
    assert score >= 0.70, f"Expected strong similarity score >= 0.70, got {score}"

    # Disjoint descriptions
    unrelated_a = "Red leather wallet containing student identity card and cash"
    unrelated_b = "Blue folding umbrella with wooden handle"
    unrelated_score = calculate_description_similarity(unrelated_a, unrelated_b)
    assert unrelated_score == 0.0

    # Empty string edge case
    assert calculate_description_similarity("", "Sample description") == 0.0
