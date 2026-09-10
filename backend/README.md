# AI Lost-and-Found Matcher — Backend

Production-quality backend for an academic Artificial Intelligence project implementing **Intelligent Agents** and **Heuristic Matching**.

The backend exposes a single unified REST API consumed by both:
- **Next.js Web Application** (Vercel)
- **Expo React Native Mobile Application** (iOS / Android)

Frontend clients **never communicate directly with the database**. All queries, validation, AI heuristic matching, candidate ranking, and scoring rules are centralized exclusively in this FastAPI service.

---

## Architecture

```
                    ┌─────────────────────────┐
                    │     Next.js Web App     │
                    │         Vercel          │
                    └────────────┬────────────┘
                                 │
                                 │ HTTPS / REST (/api/v1/...)
                                 ▼
                    ┌─────────────────────────┐
                    │     FastAPI Backend     │
                    │         Railway         │
                    │                         │
                    │  API Layer              │
                    │  Service Layer          │
                    │  Matching Engine (AI)   │
                    │  Decision Engine        │
                    │  Explanation Engine     │
                    │  Validation (Pydantic)  │
                    │  Repositories (ORM)     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   PostgreSQL Database   │
                    │        Supabase         │
                    └─────────────────────────┘
                                 ▲
                                 │
                    ┌────────────┴────────────┐
                    │    Expo React Native    │
                    │       Mobile App        │
                    └─────────────────────────┘
```

---

## Core Academic AI Concepts

### 1. Intelligent Agent
The backend acts as an autonomous intelligent matching agent that follows a goal-directed cycle:
1. **Perception**: Ingests a newly filed item report (LOST or FOUND).
2. **Environment Filtering**: Automatically retrieves candidate items of the opposite type from PostgreSQL (`LOST` $\rightarrow$ `FOUND` or `FOUND` $\rightarrow$ `LOST`). Rejects invalid pairs (LOST vs LOST, FOUND vs FOUND).
3. **Feature Extraction**: Cleans, standardizes, and normalizes categorical taxonomy, color tokens, campus landmarks, UTC timestamps, and lexical tokens.
4. **Heuristic Evaluation**: Executes a multi-factor mathematical compatibility function.
5. **Confidence-Aware Abstention**: Prevents hallucinations and false positive matches by demoting conflicting items.
6. **Explanation Synthesis**: Produces transparent, human-readable factor-by-factor justifications.
7. **Ranked Delivery**: Sorts candidates in descending order of compatibility.

### 2. Explainable Heuristic Matching
Instead of a black-box model or rigid SQL exact matches, matching is evaluated mathematically across 5 weighted dimensions:

$$\text{Overall Score} = (0.20 \cdot s_{\text{cat}} + 0.15 \cdot s_{\text{col}} + 0.20 \cdot s_{\text{loc}} + 0.20 \cdot s_{\text{time}} + 0.25 \cdot s_{\text{desc}}) \times 100$$

| Factor | Weight | Evaluation Method |
| :--- | :---: | :--- |
| **Category** | $20\%$ | Canonical taxonomy matching & taxonomic affinity matrix ($1.0, 0.8, 0.0$) |
| **Color** | $15\%$ | Color normalization, tonal family affinities, and neutral baseline ($0.50$) for missing data |
| **Location** | $20\%$ | Campus zone matching ($1.0$), adjacent zones ($0.50 - 0.70$), or distinct areas ($0.05$) |
| **Time** | $20\%$ | Event chronology with exponential decay and severe inversion penalties ($0.0$) if found before lost |
| **Description** | $25\%$ | Deterministic offline NLP tokenization, stopword filtering, stemming, and Sørensen–Dice / Jaccard similarity |

For full mathematical proofs, curves, and formulas, see [docs/MATCHING_ALGORITHM.md](docs/MATCHING_ALGORITHM.md).

---

## Decision Thresholds & Confidence Abstention

| Score Range | Decision | Action / Meaning |
| :---: | :---: | :--- |
| $\mathbf{\ge 80.00}$ | `MATCH` | High-confidence candidate match supported by consistent evidence across multiple factors. |
| $\mathbf{50.00 - 79.99}$ | `REVIEW` | Moderate compatibility; requires manual verification by campus lost-and-found staff. |
| $\mathbf{< 50.00}$ | `NO_RELIABLE_MATCH` | Low compatibility; available evidence indicates different items. The AI actively abstains from forcing a match. |

**Abstention Rules**:
- Incompatible categories (e.g. Wallet vs Laptop) **cannot** yield a `MATCH` even if description overlap pushes the score $\ge 80$.
- Chronological contradiction (item found days before reported lost) demotes decisions to `NO_RELIABLE_MATCH`.
- Matches require corroborated signals across at least two independent dimensions.

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app, lifespan, CORS, error handlers
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic BaseSettings, auto-normalizes Supabase DB URLs
│   │   ├── database.py             # SQLAlchemy 2.0 engine, SessionLocal, get_db dependency
│   │   └── logging.py              # Structured logger for stdout and Railway
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py         # Router aggregator (/api/v1)
│   │       ├── health.py           # Health check and DB ping endpoints
│   │       ├── reports.py          # Report CRUD endpoints with filtering
│   │       └── matching.py         # POST /api/v1/match & GET /api/v1/matches/{id}
│   ├── models/
│   │   ├── __init__.py
│   │   ├── report.py               # SQLAlchemy 2.0 Report model
│   │   └── match.py                # SQLAlchemy 2.0 MatchRecord audit model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py               # ApiResponse[T] generic envelope & ErrorDetail
│   │   ├── report.py               # ReportCreate, ReportUpdate, ReportResponse
│   │   └── matching.py             # MatchRequest, MatchResponse, FactorScores, Explanation
│   ├── services/
│   │   ├── __init__.py
│   │   ├── report_service.py       # Report business logic
│   │   ├── matching_service.py     # Intelligent agent orchestration
│   │   └── explanation_service.py  # Factor-by-factor human explainability generator
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── heuristic_engine.py     # HeuristicMatcher (core AI agent)
│   │   ├── scoring.py              # Centralized weights, time curve, weighted formula
│   │   ├── similarity.py           # Category, color, location, and description NLP
│   │   ├── normalization.py        # Alias mappings and text cleaning
│   │   ├── decision.py             # Confidence thresholds and abstention logic
│   │   └── ranking.py              # Deterministic multi-key candidate ranking
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── report_repository.py    # Parameterized DB access for Reports
│   │   └── match_repository.py     # DB access for Match auditing
│   ├── db/
│   │   └── migrations/             # Alembic migration scripts
│   └── utils/
│       ├── __init__.py
│       ├── dates.py                # UTC date parsing & time differences
│       ├── text.py                 # Tokenization and stopword removal
│       └── enums.py                # ReportType, MatchDecision, StandardCategory
├── docs/
│   └── MATCHING_ALGORITHM.md       # Academic documentation & worked numerical example
├── tests/                          # 27 Automated unit and integration tests
│   ├── conftest.py                 # Isolated in-memory DB fixture
│   ├── test_health.py
│   ├── test_reports.py
│   ├── test_similarity.py
│   ├── test_scoring.py
│   ├── test_decision.py
│   └── test_matching.py            # Covers all 10 academic test scenarios
├── alembic.ini                     # Alembic migration config
├── requirements.txt                # Production dependencies
├── .env.example                    # Template environment variables
├── Dockerfile                      # Production container for Railway
└── railway.toml                    # Railway deployment manifest
```

---

## Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///./lost_and_found.db` | PostgreSQL connection string from Supabase (or local SQLite for dev) |
| `ENVIRONMENT` | `development` | `development`, `production`, or `testing` |
| `LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `APP_NAME` | `AI Lost and Found Matcher` | Application display name in Swagger / Health |
| `APP_VERSION` | `1.0.0` | API semantic version |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:8081` | Comma-separated allowed frontend origins |
| `PORT` | `8000` | Port for local server (Railway dynamically overrides this) |
| `HOST` | `0.0.0.0` | Host binding interface |

---

## Supabase PostgreSQL Setup

1. Open [supabase.com](https://supabase.com) and create a project.
2. Navigate to **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection string** $\rightarrow$ **URI**.
3. Choose either:
   - **Direct Connection** (Session mode, port 5432):
     ```
     postgresql+psycopg://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
     ```
   - **Connection Pooler** (Transaction mode, port 6543):
     ```
     postgresql+psycopg://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
     ```
4. Set `DATABASE_URL` in your `.env` or Railway Environment Variables.
   *(Note: The backend automatically transforms `postgres://` or `postgresql://` to `postgresql+psycopg://` for SQLAlchemy 2.0 compatibility).*

---

## Local Development Setup

### 1. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 2. Run Database Migrations
```bash
python -m alembic upgrade head
```

### 3. Start Development Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```

The interactive API documentation is now live at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/api/v1/health`

---

## Running Automated Tests

Run the complete test suite:
```bash
python -m pytest -v
```

All 27 automated tests run against an isolated in-memory test database, validating:
- The 10 required academic test scenarios (High match, lower score, unrelated items, moderate review, LOST vs LOST rejection, missing color handling, different category abstention, chronological inconsistency, candidate ranking, metadata vs description balance)
- Attribute normalization and similarity algorithms
- Scoring weights and piecewise time curves
- CRUD operations and Pydantic v2 validation error responses

---

## Railway Deployment

The backend is configured for 1-click Railway deployment with zero manual configuration.

### Steps:
1. Push your repository to GitHub.
2. In [Railway.app](https://railway.app), click **New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Select your repository.
4. If your backend is in `backend/`, set **Root Directory** in Railway Service Settings to `/backend` (or leave it as root `/` since root Dockerfile is also included).
5. In the **Variables** tab, add your environment variables:
   - `DATABASE_URL`: Your Supabase connection string
   - `ENVIRONMENT`: `production`
   - `CORS_ORIGINS`: `https://your-nextjs-app.vercel.app,http://localhost:3000`
6. Railway detects `Dockerfile` / `railway.toml`, injects `$PORT` dynamically, automatically runs `alembic upgrade head`, and starts Uvicorn.
7. Railway health check will automatically verify `/api/v1/health`.

---

## Frontend Integration Contract (Next.js & Expo)

Both Next.js and Expo React Native consume these exact REST endpoints.

### API Response Envelope
All API responses follow a strict envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
}
```

### Key Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/health` | Service uptime and version | 200 |
| `GET` | `/api/v1/health/db` | Database connectivity check | 200 |
| `POST` | `/api/v1/reports` | Submit a new LOST or FOUND report | 201 |
| `GET` | `/api/v1/reports` | List reports (query: `type`, `category`, `location`, `limit`) | 200 |
| `GET` | `/api/v1/reports/{id}` | Retrieve report by UUID | 200 / 404 |
| `PATCH` | `/api/v1/reports/{id}` | Update existing report | 200 / 404 |
| `DELETE` | `/api/v1/reports/{id}` | Remove report | 200 / 404 |
| `POST` | `/api/v1/match` | Run AI heuristic matching for a report UUID | 200 / 404 |
| `GET` | `/api/v1/matches/{id}`| Retrieve ranked matches for a report | 200 / 404 |

---

## Example Usage

### 1. Create a LOST Report
```bash
curl -X POST "http://localhost:8000/api/v1/reports" \
     -H "Content-Type: application/json" \
     -d '{
       "type": "LOST",
       "category": "Mobile Phone",
       "color": "Black",
       "location": "Library",
       "date_time": "2026-09-10T09:00:00Z",
       "description": "Black Samsung Galaxy S23 with cracked screen and blue case"
     }'
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "type": "LOST",
    "category": "Mobile Phone",
    "color": "Black",
    "location": "Library",
    "date_time": "2026-09-10T09:00:00Z",
    "description": "Black Samsung Galaxy S23 with cracked screen and blue case",
    "photo_url": null,
    "created_at": "2026-09-10T09:05:00Z",
    "updated_at": "2026-09-10T09:05:00Z"
  },
  "error": null
}
```

### 2. Run AI Matching
```bash
curl -X POST "http://localhost:8000/api/v1/match" \
     -H "Content-Type: application/json" \
     -d '{
       "report_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
       "limit": 5
     }'
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "source_report": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "type": "LOST",
      "category": "Mobile Phone",
      "color": "Black",
      "location": "Library",
      "date_time": "2026-09-10T09:00:00Z",
      "description": "Black Samsung Galaxy S23 with cracked screen and blue case"
    },
    "candidates_evaluated": 12,
    "total_matches_returned": 3,
    "matches": [
      {
        "candidate_report": {
          "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
          "type": "FOUND",
          "category": "Mobile Phone",
          "color": "Black",
          "location": "Library",
          "date_time": "2026-09-10T10:15:00Z",
          "description": "Found Samsung black phone, blue case, screen has crack"
        },
        "overall_score": 91.2,
        "decision": "MATCH",
        "factors": {
          "category": 1.0,
          "color": 1.0,
          "location": 1.0,
          "time": 1.0,
          "description": 0.65
        },
        "explanation": {
          "summary": "High-confidence candidate match supported by consistent attributes across multiple factors.",
          "reasons": [
            "Category matches exactly (Mobile Phone).",
            "Color matches exactly (Black).",
            "Both reports refer to the same campus location (Library).",
            "Timing is highly compatible: Reports occurred within 1.2 hours of each other.",
            "Strong description similarity; matching terms: 'blue', 'case', 'crack', 'phone', 'samsung', 'screen'."
          ],
          "negative_factors": [],
          "notes": []
        }
      }
    ]
  },
  "error": null
}
```

---

## Future Extensibility

The database schema and architecture include non-breaking support for future iterations:
- `photo_url` column is already present in `reports` table.
- Future computer vision / embedding similarity (e.g. CLIP embeddings) can plug in as a 6th factor in `app/ai/scoring.py` with dynamic weight redistribution without breaking existing text-based heuristic logic.
