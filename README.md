# ReQuote

Professional quote estimation and management platform.

## Tech Stack

| Layer       | Technology                       |
|-------------|----------------------------------|
| Frontend    | React 18 · Vite · TypeScript     |
| Backend     | Python 3.12 · FastAPI            |
| ORM         | SQLAlchemy 2.0 (async)           |
| Migrations  | Alembic                          |
| Database    | PostgreSQL 16                    |
| Container   | Docker · Docker Compose          |

## Project Structure

```
ReQuote/
├── .env.example               ← copy to .env, fill secrets
├── .gitignore
├── docker-compose.yml
├── README.md
│
├── frontend/                  ← React + Vite + TypeScript SPA
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
│
└── backend/
    ├── app/
    │   ├── main.py            ← FastAPI app + CORS
    │   ├── config.py          ← Pydantic settings (reads .env)
    │   ├── database.py        ← SQLAlchemy async engine + session
    │   ├── models/
    │   │   ├── base.py        ← DeclarativeBase + TimestampMixin
    │   │   └── quotation.py   ← Quotation + QuotationItem models
    │   └── routers/
    │       └── health.py      ← GET /health (pings DB)
    ├── alembic/
    │   ├── env.py             ← reads DATABASE_URL at runtime
    │   ├── script.py.mako
    │   └── versions/
    │       └── 0001_initial_create_quotations_and_items.py
    ├── tests/
    │   ├── conftest.py        ← SQLite in-memory fixtures
    │   └── test_models.py     ← 22 model + monetary tests
    ├── alembic.ini
    ├── pytest.ini
    └── requirements.txt
```

## Getting Started

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and update DATABASE_URL to match
```

### 3. Build and start

```bash
docker compose up --build
```

### 4. Run database migrations

Run once after first startup, and after any new migration file is added:

```bash
# Inside the running backend container:
docker compose exec backend alembic upgrade head

# Or locally (with DATABASE_URL pointing to localhost:5432):
cd backend
.venv\Scripts\python -m alembic upgrade head
```

### 5. Verify services

| Service       | URL                              | Description              |
|---------------|----------------------------------|--------------------------|
| Frontend      | http://localhost                 | React SPA                |
| API docs      | http://localhost:8000/docs       | FastAPI Swagger UI       |
| Health check  | http://localhost:8000/health     | Service + DB status      |

### 6. Run tests

Tests use an in-memory SQLite engine — no running PostgreSQL required:

```bash
cd backend
.venv\Scripts\python -m pytest -v
```

### 7. Stop

```bash
docker compose down          # keep DB data
docker compose down -v       # also wipe DB volume
```

---

## Alembic Cheatsheet

```bash
cd backend

# Generate a new migration from model changes:
alembic revision --autogenerate -m "describe_the_change"

# Apply all pending migrations:
alembic upgrade head

# Roll back one step:
alembic downgrade -1

# Show current applied revision:
alembic current

# Show full history:
alembic history
```

---

## Development Notes

- Backend environment variables are loaded from `.env` via Pydantic Settings.
- The frontend Nginx config proxies `/api/*` to the FastAPI backend.
- The `db` service must pass its healthcheck before the `backend` starts.
- Actual `.env` files are excluded by `.gitignore` — never commit them.
- All monetary values use `NUMERIC(12, 4)` / Python `Decimal` — never `float`.

## Roadmap

- [x] Phase 1: Project foundation (React + FastAPI + PostgreSQL + Docker)
- [x] Phase 2: Database foundation (SQLAlchemy models + Alembic migrations + tests)
- [ ] Phase 3: Quote CRUD API endpoints
- [ ] Phase 4: Authentication (JWT)
- [ ] Phase 5: AI-assisted quote generation
- [ ] Phase 6: CI/CD pipeline
