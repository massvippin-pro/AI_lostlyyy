# AI_lostlyyy

Production-quality AI Lost-and-Found Matcher with FastAPI backend and Lostly Next.js frontend implementing **Intelligent Agents** and **Heuristic Matching**.

## Quick Links
- **Backend Source Code**: [`backend/`](backend/)
- **Academic AI Documentation & Worked Examples**: [`backend/docs/MATCHING_ALGORITHM.md`](backend/docs/MATCHING_ALGORITHM.md)
- **Comprehensive Backend README**: [`backend/README.md`](backend/README.md)

---

## Quickstart (Local Development)

```bash
# 1. Enter backend
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run database migrations
python -m alembic upgrade head

# 4. Run automated test suite (27 tests)
python -m pytest -v

# 5. Start FastAPI application
python -m uvicorn app.main:app --reload --port 8000
```

Open interactive Swagger UI at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## Deployment (Railway & Supabase PostgreSQL)
- Database: **Supabase PostgreSQL** (Set `DATABASE_URL=postgresql+psycopg://...`)
- Backend: **Railway** (Includes both root and backend `Dockerfile` & `railway.toml` with dynamic `$PORT` handling).
- Frontend Clients: **Next.js Web** and **Expo React Native Mobile** connect to the unified REST API (`/api/v1/...`).
