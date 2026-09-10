# AI Lost-and-Found Heuristic Matching Algorithm

## 1. Academic AI Foundations

The **AI Lost-and-Found Matcher** implements two core concepts from Artificial Intelligence:

1. **Intelligent Agents**: An autonomous agent that perceives its environment (receiving a newly reported item), determines its goal (finding corresponding lost or found items), systematically filters candidate search spaces, extracts multi-dimensional attributes, evaluates compatibility heuristics, applies confidence thresholds, and formulates an explainable decision.
2. **Heuristic Matching**: Rather than relying on rigid exact string equality or brittle boolean searches, the engine employs a multi-factor mathematical compatibility function. Each dimension produces a normalized score $s_i \in [0.0, 1.0]$, weighted by domain significance to compute a composite score.

```
Incoming Report (Lost / Found)
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ Intelligent Matching Agent                             │
│                                                        │
│  1. Identify Report Type & Fetch Opposite Candidates   │
│  2. Reject Malformed / Identical Type Candidates       │
│  3. Normalization Pipeline (Category, Color, Location) │
│  4. Deterministic NLP Tokenizer & Stemmer              │
│  5. Multi-Factor Evaluation (Category, Color, etc.)    │
│  6. Chronological & Inversion Penalty Engine           │
│  7. Centralized Weighted Composite Scoring             │
│  8. Confidence-Aware Abstention Policy                 │
│  9. Multi-Factor Explainability Synthesis              │
│ 10. Descending Rank Ordering & Output Generation       │
└────────────────────────────────────────────────────────┘
            │
            ▼
Ranked Recommendations + Decision + Factor Explanations
```

---

## 2. Input Attributes & Normalization Pipeline

Raw user input often contains spelling differences, casing, synonyms, and informal descriptions. To guarantee **deterministic, reproducible matching**, all attributes undergo normalization prior to scoring without mutating raw database records:

| Attribute | Raw Example | Normalized Form | Method |
| :--- | :--- | :--- | :--- |
| **Category** | `"  Mobile Phone  "`, `"iphone"` | `"MOBILE_PHONE"` | Taxonomy alias dictionary & uppercase sanitization |
| **Color** | `"grey"`, `"dark blue"` | `"gray"`, `"blue"` | Color synonym lookup & primary hue extraction |
| **Location** | `"central library"`, `"lib"` | `"LIBRARY"` | Campus zone alias mapping |
| **Time** | Local string or ISO timestamp | UTC timezone `datetime` | ISO-8601 parsing & timezone offset alignment |
| **Description** | `"Black Samsung with cracked screen!"` | `["samsung", "phone", "crack", "screen"]` | Lowercase, non-alphanumeric strip, stopword filter, deterministic stemming |

---

## 3. Centralized Factor Weights

The heuristic engine assigns fixed weights summing to $1.00$ ($100\%$):

$$\text{Overall Score} = \sum_{i} w_i \cdot s_i \times 100$$

Where:
- $w_{\text{category}} = 0.20$ ($20\%$)
- $w_{\text{color}} = 0.15$ ($15\%$)
- $w_{\text{location}} = 0.20$ ($20\%$)
- $w_{\text{time}} = 0.20$ ($20\%$)
- $w_{\text{description}} = 0.25$ ($25\%$)

Total = $1.00$ ($100\%$). Centralized in `app.ai.scoring.ScoringWeights`.

---

## 4. Sub-Score Compatibility Functions

### 4.1. Category Compatibility ($s_{\text{category}} \in [0.0, 1.0]$)
- **$1.00$**: Exact canonical category match (e.g. `MOBILE_PHONE` $\leftrightarrow$ `MOBILE_PHONE`).
- **$0.70 - 0.85$**: Taxonomically related categories (e.g. `MOBILE_PHONE` $\leftrightarrow$ `ELECTRONICS` = $0.80$, `ID_CARD` $\leftrightarrow$ `DOCUMENT` = $0.85$, `WALLET` $\leftrightarrow$ `ACCESSORY` = $0.75$).
- **$0.25$**: Unclassified or `OTHER` category.
- **$0.00$**: Incompatible categories (e.g. `MOBILE_PHONE` $\leftrightarrow$ `WALLET`).

### 4.2. Color Compatibility ($s_{\text{color}} \in [0.0, 1.0]$)
- **$1.00$**: Exact normalized color match (e.g. `black` $\leftrightarrow$ `black`, `grey` $\leftrightarrow$ `gray`).
- **$0.60 - 0.85$**: Compatible tonal families (e.g. `silver` $\leftrightarrow$ `gray` = $0.85$, `black` $\leftrightarrow$ `gray` = $0.60$).
- **$0.50$ (Neutral Baseline)**: If color is unspecified in one or both reports, the engine adopts a transparent neutral score ($0.50$) rather than unfairly destroying the overall score.
- **$0.00$**: Distinct, conflicting colors (e.g. `black` $\leftrightarrow$ `red`).

### 4.3. Location Compatibility ($s_{\text{location}} \in [0.0, 1.0]$)
- **$1.00$**: Exact campus location zone (e.g. `LIBRARY` $\leftrightarrow$ `LIBRARY`).
- **$0.50 - 0.70$**: Adjacent or related campus areas (e.g. `LIBRARY` $\leftrightarrow$ `CLASSROOM` = $0.60$, `LAB` $\leftrightarrow$ `MAIN_BLOCK` = $0.70$).
- **$0.05$**: Distinct campus zones.

### 4.4. Time Compatibility & Chronological Inversion ($s_{\text{time}} \in [0.0, 1.0]$)
Given:
$$\Delta t = t_{\text{found}} - t_{\text{lost}} \quad (\text{hours})$$

#### Normal Chronology ($\Delta t \ge 0$):
Item was lost first, then discovered later:
- $\Delta t \le 2\text{ hours}$: $s = 1.00$
- $\Delta t \le 6\text{ hours}$: $s = 0.95$
- $\Delta t \le 24\text{ hours}$ ($1\text{ day}$): $s = 0.90$
- $\Delta t \le 72\text{ hours}$ ($3\text{ days}$): $s = 0.80$
- $\Delta t \le 168\text{ hours}$ ($7\text{ days}$): $s = 0.65$
- $\Delta t \le 336\text{ hours}$ ($14\text{ days}$): $s = 0.50$
- $\Delta t \le 720\text{ hours}$ ($30\text{ days}$): $s = 0.30$
- $\Delta t > 720\text{ hours}$: $s = \max\left(0.05, 0.30 \cdot e^{-0.001 (\Delta t - 720)}\right)$

#### Inversion Handling ($\Delta t < 0$):
Item was reported found *before* it was reported lost:
- $|\Delta t| \le 2\text{ hours}$: $s = 0.60$ (Minor estimation variance or clock skew).
- $2 < |\Delta t| \le 24\text{ hours}$: $s = 0.20$ (Severe inversion penalty).
- $|\Delta t| > 24\text{ hours}$: $s = 0.00$ (Physically contradictory report sequence).

### 4.5. Description Similarity ($s_{\text{desc}} \in [0.0, 1.0]$)
Deterministic, offline NLP without external API calls or LLM latency.
1. Text is normalized, stripped of punctuation, and tokenized.
2. English stopwords (`the`, `with`, `and`, `my`, `lost`, `found`) are filtered out.
3. Word suffixes are stemmed (`cracked` $\rightarrow$ `crack`, `screens` $\rightarrow$ `screen`).
4. Overlap is computed using a balanced blend of **Sørensen–Dice coefficient** and **Jaccard index**:
$$D(A, B) = \frac{2 |A \cap B|}{|A| + |B|}, \quad J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
$$s_{\text{desc}} = 0.70 \cdot D(A, B) + 0.30 \cdot J(A, B)$$

---

## 5. Decision Thresholds & Confidence Abstention

### 5.1. Numeric Thresholds
- **$\ge 80.00$**: `MATCH` — High confidence; immediate recommendation.
- **$50.00 - 79.99$**: `REVIEW` — Moderate confidence; manual staff verification recommended.
- **$< 50.00$**: `NO_RELIABLE_MATCH` — Low confidence; reports describe different items.

### 5.2. Confidence-Aware Abstention Rules
An intelligent AI system must **not pretend to be confident** when faced with contradictory evidence:
1. **Category Contradiction**: If $s_{\text{category}} = 0.00$, the system will **never** classify the result as `MATCH`, even if accidental text overlap pushes the score $\ge 80$. The decision is demoted to `REVIEW`.
2. **Chronological Impossibility**: If $s_{\text{time}} = 0.00$ (found days before lost), the match is demoted to `NO_RELIABLE_MATCH`.
3. **Corroboration Requirement**: A `MATCH` requires at least two distinct factors with $s_i \ge 0.60$.

---

## 6. Worked Numerical Example

### Scenario
- **LOST Report**:
  - Category: `"Mobile Phone"`
  - Color: `"Black"`
  - Location: `"Library"`
  - Date: `2026-09-10 10:00:00 UTC`
  - Description: `"Black Samsung Galaxy phone with cracked screen and blue case"`
- **FOUND Candidate**:
  - Category: `"mobile"`
  - Color: `"Black"`
  - Location: `"Library 2nd floor"`
  - Date: `2026-09-10 11:30:00 UTC`
  - Description: `"Samsung phone black, screen has crack, blue cover"`

### Step-by-Step Scoring

1. **Category**:
   - Normalized: `"MOBILE_PHONE"` $\leftrightarrow$ `"MOBILE_PHONE"`
   - Score: $s_{\text{category}} = 1.00$
   - Weighted: $1.00 \times 0.20 = 0.20$

2. **Color**:
   - Normalized: `"black"` $\leftrightarrow$ `"black"`
   - Score: $s_{\text{color}} = 1.00$
   - Weighted: $1.00 \times 0.15 = 0.15$

3. **Location**:
   - Normalized: `"LIBRARY"` $\leftrightarrow$ `"LIBRARY"`
   - Score: $s_{\text{location}} = 1.00$
   - Weighted: $1.00 \times 0.20 = 0.20$

4. **Time**:
   - Difference: $+1.5\text{ hours}$ (Found $1.5$ hours after lost)
   - Curve: $\le 2\text{ hours} \rightarrow 1.00$
   - Score: $s_{\text{time}} = 1.00$
   - Weighted: $1.00 \times 0.20 = 0.20$

5. **Description**:
   - Tokens A: `{"samsung", "galaxi", "phone", "crack", "screen", "blue", "case"}`
   - Tokens B: `{"samsung", "phone", "black", "screen", "crack", "blue", "cover"}`
   - Overlap: `{"samsung", "phone", "crack", "screen", "blue"}` ($5$ shared terms)
   - Sørensen–Dice: $\frac{2 \times 5}{7 + 7} = \frac{10}{14} \approx 0.7143$
   - Jaccard: $\frac{5}{9} \approx 0.5556$
   - Blend: $0.70(0.7143) + 0.30(0.5556) \approx 0.6667$
   - Weighted: $0.6667 \times 0.25 \approx 0.1667$

### Overall Score
$$\text{Overall Score} = (0.20 + 0.15 + 0.20 + 0.20 + 0.1667) \times 100 = 91.67$$

### Decision
$$\text{Score } 91.67 \ge 80.00 \longrightarrow \mathbf{MATCH}$$

### Transparent Explanation Output
```json
{
  "summary": "High-confidence candidate match supported by consistent attributes across multiple factors.",
  "reasons": [
    "Category matches exactly (Mobile Phone).",
    "Color matches exactly (Black).",
    "Both reports refer to the same campus location (Library).",
    "Timing is highly compatible: Reports are virtually concurrent (within 1.5h).",
    "Strong description similarity; matching terms: 'blue', 'crack', 'phone', 'samsung', 'screen'."
  ],
  "negative_factors": [],
  "notes": []
}
```

---

## 7. Academic Viva / Evaluation Q&A

### Q1: What makes this an Artificial Intelligence system rather than basic CRUD?
**Answer**: CRUD simply stores and retrieves records. This system implements an **Intelligent Agent** with an autonomous perception-action loop: it perceives an incoming lost or found event, retrieves opposite-type candidates, extracts multi-dimensional attributes, applies a multi-factor **heuristic evaluation function**, handles fuzzy text matching and temporal decay curves, applies confidence-aware abstention to prevent false positives, and generates explainable reasoning.

### Q2: What is the heuristic?
**Answer**: A weighted multi-attribute compatibility function that maps heterogeneous real-world signals (categorical taxonomy, color affinity, spatial proximity, chronological sequence, and lexical overlap) into normalized $[0.0, 1.0]$ values and aggregates them using established domain weights ($20\%$ Category, $15\%$ Color, $20\%$ Location, $20\%$ Time, $25\%$ Description).

### Q3: How does the system handle confidence and low-certainty cases?
**Answer**: The system demonstrates confidence awareness through **abstention**:
1. If available evidence produces a score $< 50.0$, it returns `NO_RELIABLE_MATCH`.
2. For scores between $50.0$ and $79.9$, it designates the item as `REVIEW` rather than claiming a definite match.
3. If critical contradiction occurs (e.g. an item reported found days before it was lost, or incompatible categories), the system actively abstains from declaring a `MATCH` regardless of textual overlap.

### Q4: Why is it explainable?
**Answer**: Every score is accompanied by a full factor-by-factor decomposition and human-readable rationales detailing both positive corroborating evidence and negative penalties, ensuring transparency for campus administrators and users.
