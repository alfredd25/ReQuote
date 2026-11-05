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
    │   ├── main.py            ← FastAPI app + CORS + routers
    │   ├── config.py          ← Pydantic settings (reads .env)
    │   ├── database.py        ← SQLAlchemy async engine + session
    │   ├── security.py        ← bcrypt password hashing & PyJWT tokens
    │   ├── models/
    │   │   ├── base.py        ← DeclarativeBase + TimestampMixin
    │   │   ├── quotation.py   ← Quotation + QuotationItem models
    │   │   └── user.py        ← User model
    │   ├── schemas/
    │   │   ├── quotation.py   ← Quotation Pydantic schemas
    │   │   └── user.py        ← User & Auth Pydantic schemas
    │   └── routers/
    │       ├── auth.py        ← POST /auth/signup, /login, GET /me
    │       ├── health.py      ← GET /health (pings DB)
    │       └── quotations.py  ← Full Quote CRUD & lifecycle transitions
    ├── alembic/
    │   ├── env.py             ← reads DATABASE_URL at runtime
    │   ├── script.py.mako
    │   └── versions/
    │       ├── 0001_initial_create_quotations_and_items.py
    │       └── 0002_create_users_table.py
    ├── tests/
    │   ├── conftest.py        ← SQLite in-memory sync & async fixtures
    │   ├── test_models.py     ← 22 model + monetary tests
    │   ├── test_api_quotations.py ← 50 HTTPX quotation API tests
    │   └── test_auth.py       ← 23 auth & JWT endpoint/unit tests
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
- [x] Phase 3: Quote CRUD API endpoints
  - [x] Step 1: Quotation creation and retrieval API (schemas, endpoints, calculations, tests)
  - [x] Step 2: Quotation update, deletion, and status transitions
- [ ] Phase 4: Authentication (JWT)
  - [x] Step 1: Authentication foundation (User model, Alembic migration, bcrypt hashing, JWT access tokens, signup/login/me endpoints, test suite)
  - [ ] Step 2: Route protection and user-quotation ownership checks
- [ ] Phase 5: AI-assisted quote generation
- [ ] Phase 6: CI/CD pipeline
