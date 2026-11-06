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
    │       └── quotations.py  ← Protected Quote CRUD & lifecycle transitions (ownership scoped)
    ├── alembic/
    │   ├── env.py             ← reads DATABASE_URL at runtime
    │   ├── script.py.mako
    │   └── versions/
    │       ├── 0001_initial_create_quotations_and_items.py
    │       ├── 0002_create_users_table.py
    │       └── 0003_add_user_id_to_quotations.py
    ├── tests/
    │   ├── conftest.py        ← SQLite in-memory fixtures (auth tokens & ownership fixtures)
    │   ├── test_models.py     ← 25 model, monetary & relationship tests
    │   ├── test_api_quotations.py ← 62 HTTPX quotation API tests (auth & ownership isolation)
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

**Backend tests** (in-memory SQLite engine — no PostgreSQL required):
```bash
cd backend
.venv\Scripts\python -m pytest -v
```

**Frontend tests** (Vitest + React Testing Library):
```bash
cd frontend
npm run test
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

## Authentication & Ownership

Every quotation endpoint requires a valid JWT Bearer token:
```bash
# 1. Signup / Login to get an access token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePassword123!"}' | jq -r .access_token)

# 2. Access protected quotation endpoints using the token
curl -X GET http://localhost:8000/quotations \
  -H "Authorization: Bearer $TOKEN"
```

- **Unauthenticated requests** receive `401 Unauthorized`.
- **Automatic ownership**: The authenticated user's ID is assigned to created quotations. Any client-provided `user_id` is ignored/disallowed.
- **Resource isolation**: Users can only view, update, delete, transition, or export their own quotations. Requesting another user's quotation returns `404 Not Found` to prevent resource enumeration.

## PDF Generation & Export (Phase 7)

Quotations can be exported as print-ready, professional PDF documents via the authenticated endpoint:
```bash
curl -X GET http://localhost:8000/quotations/{quotation_id}/pdf \
  -H "Authorization: Bearer $TOKEN" \
  -o quotation.pdf
```

### Configurable Business Settings
The business contact details displayed on the PDF header and footer can be customized via `.env`:
```env
BUSINESS_NAME=ReQuote Solutions
BUSINESS_EMAIL=contact@requote.io
BUSINESS_PHONE=+1 (555) 019-2834
BUSINESS_ADDRESS=100 Innovation Way, Suite 500, San Francisco, CA 94105
BUSINESS_WEBSITE=https://requote.io
```

### PDF Features
- **Print-ready typography & layout**: Uses ReportLab with 2-pass `NumberedCanvas` ("Page X of Y"), brand color accents, and crisp table borders.
- **Complete itemization**: Deliverables, units, quantities, unit prices, and Decimal-accurate line totals.
- **Accurate financial summary**: Subtotal, tax rate & amount, and grand total in the quotation's currency.
- **Client & project scope**: Structured customer billing info, project description, status badge, client notes, and terms & conditions.
- **Security & ownership**: Full user-isolation; unauthenticated requests get `401`, and unauthorized/cross-user requests return `404`.

## Roadmap

- [x] Phase 1: Project foundation (React + FastAPI + PostgreSQL + Docker)
- [x] Phase 2: Database foundation (SQLAlchemy models + Alembic migrations + tests)
- [x] Phase 3: Quote CRUD API endpoints
  - [x] Step 1: Quotation creation and retrieval API (schemas, endpoints, calculations, tests)
  - [x] Step 2: Quotation update, deletion, and status transitions
- [x] Phase 4: Authentication (JWT)
  - [x] Step 1: Authentication foundation (User model, Alembic migration, bcrypt hashing, JWT access tokens, signup/login/me endpoints, test suite)
  - [x] Step 2: Route protection and user-quotation ownership checks
- [x] Phase 5: Frontend Integration & Authentication
  - [x] Step 1: Frontend signup, login, React AuthContext, and token management
  - [x] Step 2: Protected routes, public routes, session restoration, and authenticated dashboard layout
- [x] Phase 6: Frontend Quotation Workspace & Management UI
  - [x] Step 1: Quotation dashboard metrics, listing with search/filter/pagination, and dynamic creation form
  - [x] Step 2: Quotation detail, editing, deletion, and status lifecycle management
- [x] Phase 7: Professional PDF Quotation Generation and Export
- [ ] Phase 8: CI/CD pipeline
