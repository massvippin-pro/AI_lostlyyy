"""Service for generating transparent, factor-by-factor explainable AI reasons."""

from typing import List, Optional
from app.schemas.matching import ExplanationDetail, FactorScores
from app.utils.enums import MatchDecision
from app.utils.text import tokenize


class ExplanationService:
    """Produces explainable natural language breakdowns for every heuristic match result."""

    @staticmethod
    def generate_explanation(
        decision: MatchDecision,
        factors: FactorScores,
        source_cat: str,
        cand_cat: str,
        source_color: Optional[str],
        cand_color: Optional[str],
        color_missing: bool,
        source_loc: str,
        cand_loc: str,
        time_reason: str,
        time_penalty: Optional[str],
        source_desc: str,
        cand_desc: str,
        abstention_note: Optional[str],
    ) -> ExplanationDetail:
        """Construct a transparent, factor-by-factor explanation."""
        reasons: List[str] = []
        negative_factors: List[str] = []
        notes: List[str] = []

        # 1. Category Explanation
        if factors.category == 1.0:
            reasons.append(f"Category matches exactly ({source_cat}).")
        elif factors.category >= 0.65:
            reasons.append(f"Categories are taxonomically related ({source_cat} and {cand_cat}).")
        elif factors.category == 0.0:
            negative_factors.append(f"Incompatible categories ({source_cat} vs {cand_cat}), reducing overall score.")
        else:
            negative_factors.append(f"Uncertain category affinity ({source_cat} vs {cand_cat}).")

        # 2. Color Explanation
        if color_missing:
            notes.append("Color was not specified in one or both reports; evaluated at neutral baseline.")
        elif factors.color == 1.0:
            reasons.append(f"Color matches exactly ({source_color}).")
        elif factors.color >= 0.60:
            reasons.append(f"Colors belong to compatible tonal families ({source_color} and {cand_color}).")
        else:
            negative_factors.append(f"Color mismatch ({source_color} vs {cand_color}), reducing score.")

        # 3. Location Explanation
        if factors.location == 1.0:
            reasons.append(f"Both reports refer to the same campus location ({source_loc}).")
        elif factors.location >= 0.50:
            reasons.append(f"Locations are adjacent or closely related campus zones ({source_loc} and {cand_loc}).")
        else:
            negative_factors.append(f"Different campus locations ({source_loc} vs {cand_loc}), reducing overall score.")

        # 4. Time Explanation
        if factors.time >= 0.80:
            reasons.append(f"Timing is highly compatible: {time_reason}.")
        elif factors.time >= 0.50:
            reasons.append(f"Timing is moderately compatible: {time_reason}.")
        else:
            negative_factors.append(f"Time discrepancy: {time_reason}.")

        if time_penalty:
            negative_factors.append(time_penalty)

        # 5. Description Overlap Explanation
        tokens_a = set(tokenize(source_desc, remove_stopwords=True))
        tokens_b = set(tokenize(cand_desc, remove_stopwords=True))
        shared = tokens_a & tokens_b

        if factors.description >= 0.70:
            if shared:
                terms = ", ".join(f"'{w}'" for w in sorted(shared)[:5])
                reasons.append(f"Strong description similarity; matching terms: {terms}.")
            else:
                reasons.append("High semantic alignment between report descriptions.")
        elif factors.description >= 0.40:
            if shared:
                terms = ", ".join(f"'{w}'" for w in sorted(shared)[:4])
                reasons.append(f"Moderate description overlap sharing terms: {terms}.")
            else:
                reasons.append("Moderate textual alignment between report descriptions.")
        else:
            negative_factors.append("Descriptions share few distinguishing item characteristics.")

        # 6. Abstention Notices
        if abstention_note:
            notes.append(abstention_note)

        # 7. Summary Synthesis
        if decision == MatchDecision.MATCH:
            summary = "High-confidence candidate match supported by consistent attributes across multiple factors."
        elif decision == MatchDecision.REVIEW:
            summary = "Potential candidate match with moderate alignment; manual staff review recommended."
        else:
            summary = "Low compatibility; available evidence indicates these reports describe different items."

        return ExplanationDetail(
            summary=summary,
            reasons=reasons,
            negative_factors=negative_factors,
            notes=notes,
        )
