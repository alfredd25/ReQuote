# ReQuote

[![Live Demo](https://img.shields.io/badge/Live%20Demo-re--quote.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://re-quote.vercel.app/)
[![Backend](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/React-18.3+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-209%20Passed-success?style=for-the-badge&logo=pytest&logoColor=white)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> A modern, full-stack quote estimation and proposal lifecycle management platform engineered for agencies, consultancies, and freelancers. Built with FastAPI, PostgreSQL, SQLAlchemy 2.0 (async), ReportLab, and React 18 with TypeScript.

🔗 **Production Application:** [https://re-quote.vercel.app/](https://re-quote.vercel.app/)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Application Workflow](#application-workflow)
- [Local Development Setup](#local-development-setup)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Docker Compose Quickstart](#docker-compose-quickstart)
  - [Bare-Metal Local Setup](#bare-metal-local-setup)
- [API Reference & Authentication](#api-reference--authentication)
- [Testing](#testing)
- [Deployment Architecture](#deployment-architecture)
- [Project Structure](#project-structure)
- [Security & Production Hardening](#security--production-hardening)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Overview

Freelancers and boutique agencies routinely suffer from quotation workflow fragmentation: floating-point rounding discrepancies in spreadsheets, disconnected PDF formatting, and a lack of clear quotation lifecycle audit trails. 

**ReQuote** solves this by providing:
1. **Decimal-exact financial math**: Backed by Python's `Decimal` and PostgreSQL `NUMERIC(12, 4)` types across all unit rates, line totals, tax calculations, and final balances—never losing a cent to binary floating-point errors.
2. **Server-side ReportLab PDF compilation**: Publication-grade two-pass PDF rendering (`NumberedCanvas` with "Page X of Y"), customized branding, terms, notes, and tabular financial summaries.
3. **Strict tenant data isolation**: Enforced JWT ownership checks ensuring users cannot view, edit, delete, or enumerate another tenant's quotations or business profiles.
4. **Minimal dark SaaS user experience**: High-contrast, keyboard-friendly UI inspired by modern developer tooling (Render / Linear), with responsive table pagination, debounced search, and status filtering.

---

## Key Features

- **High-Precision Decimal Calculations**: Quantities, unit rates, tax amounts, line items, and subtotals calculated with decimal precision throughout database, ORM, API, and frontend preview layers.
- **Quotation Lifecycle Engine**: Enforced state-machine transitions through `draft` → `sent` → `accepted` / `rejected` / `expired` with terminal state protection and audit timestamps.
- **Dynamic Business Profile & Settings**: Configurable company identity, contact details, tax identifiers, and default terms that dynamically populate exported documents and preview panes.
- **Server-Side PDF Generation**: On-demand ReportLab PDF compilation streamed directly as an authenticated binary download with zero disk footprint on ephemeral cloud workers.
- **Robust Authentication & Multi-Tenancy**: Secure password hashing with `bcrypt`, HS256 JWT access tokens, authenticated session restoration, and cross-tenant `404 Not Found` scoping to prevent ID enumeration.
- **Production-Ready Observability**: Granular `/health/live`, `/health/ready`, and diagnostic `/health` endpoints with active database ping latency reporting.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite | Single-page application, custom responsive dark theme |
| **Routing & State** | React Router 7, React Context | Protected/public route gates, authentication lifecycle |
| **Backend API** | Python 3.12, FastAPI, Uvicorn | Asynchronous RESTful API framework |
| **ORM & Database Access** | SQLAlchemy 2.0 (async), asyncpg, psycopg2 | Async runtime query engine & sync migration executor |
| **Database Migrations** | Alembic | Version-controlled schema migrations |
| **Database Engine** | PostgreSQL 16 (Neon / Local) | Relational persistence with foreign keys & indexes |
| **PDF Generation** | ReportLab 4.x | Programmatic vector PDF compilation with dynamic canvas |
| **Authentication & Security** | PyJWT, Passlib (bcrypt) | Stateless bearer token authentication & password hashing |
| **Containerization** | Docker, Docker Compose, Nginx | Multi-stage production builds and local dev orchestration |
| **Testing** | Pytest, HTTPX, Vitest, Testing Library | 209 automated unit, integration, and UI component tests |

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Browser"]
        SPA["React 18 + Vite SPA<br/>(re-quote.vercel.app)"]
    end

    subgraph CDN ["Frontend Hosting (Vercel)"]
        Edge["Vercel Edge Network<br/>Static Assets + vercel.json Rewrites"]
    end

    subgraph CloudAPI ["Backend Hosting (Render)"]
        FastAPI["FastAPI 0.115+ Application<br/>(uvicorn, Python 3.12)"]
        AuthMiddleware["Security & Rate-Limit Middleware<br/>(2MB Body Cap, Security Headers)"]
        PDFService["ReportLab PDF Engine<br/>(In-Memory Stream)"]
    end

    subgraph CloudDB ["Managed Database (Neon)"]
        PostgreSQL[("PostgreSQL 16 Serverless<br/>(Async Connection Pool, SSL)")]
    end

    Client -->|HTTPS Request| Edge
    Edge --> SPA
    SPA -->|REST API Requests + Bearer JWT| FastAPI
    FastAPI --> AuthMiddleware
    AuthMiddleware -->|Async Queries| PostgreSQL
    FastAPI -->|Compile on GET /quotations/:id/pdf| PDFService
    PDFService -->|application/pdf Stream| SPA
```

---

## Application Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Freelancer / Agency
    participant UI as React SPA (Vercel)
    participant API as FastAPI Backend (Render)
    participant DB as PostgreSQL (Neon)

    User->>UI: Sign up or Login
    UI->>API: POST /api/auth/login
    API->>DB: Query User & Verify Password Hash
    API-->>UI: Return JWT Access Token
    UI->>UI: Store Token in localStorage / Memory

    User->>UI: Update Company Details (/settings)
    UI->>API: PUT /api/profile (with Bearer Token)
    API->>DB: Upsert BusinessProfile record for user_id
    API-->>UI: 200 OK (Updated Profile)

    User->>UI: Create Quotation (/quotations/new)
    Note over UI: Calculates live item totals with decimal math
    UI->>API: POST /api/quotations
    API->>DB: Insert Quotation & Line Items (transactional)
    API-->>UI: 201 Created (Quotation object)

    User->>UI: Transition Status (draft -> sent -> accepted)
    UI->>API: PATCH /api/quotations/:id/status
    API->>DB: Validate state transition & persist
    API-->>UI: 200 OK

    User->>UI: Click "Download PDF"
    UI->>API: GET /api/quotations/:id/pdf
    API->>DB: Fetch Quotation + Line Items + BusinessProfile
    Note over API: ReportLab generates in-memory PDF
    API-->>UI: 200 OK (Binary application/pdf)
    UI-->>User: Browser downloads branded quotation PDF
```

---

## Local Development Setup

### Prerequisites

- **Docker Desktop** (version 4.x or later) — *Recommended for zero-configuration setup*
- **Python** (version 3.12+) — *For bare-metal backend development*
- **Node.js** (version 18+ or 20 LTS) & **npm** — *For bare-metal frontend development*

---

### Environment Variables

Copy the provided `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `POSTGRES_DB` | Name of the PostgreSQL database | `requote` |
| `POSTGRES_USER` | PostgreSQL superuser username | `requote` |
| `POSTGRES_PASSWORD` | PostgreSQL superuser password | `changeme_use_a_strong_password` |
| `DATABASE_URL` | SQLAlchemy async connection string | `postgresql://requote:password@localhost:5432/requote` |
| `APP_ENV` | Application environment mode | `development` or `production` |
| `DEBUG` | Enable debug mode and interactive docs | `false` |
| `LOG_LEVEL` | Application logging verbosity | `INFO` |
| `JWT_SECRET_KEY` | Secret key for signing HS256 tokens | `secure_random_key_min_32_bytes` |
| `JWT_ALGORITHM` | Cryptographic algorithm for JWT | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `60` |
| `CORS_ORIGINS` | Allowed origins (JSON array or string) | `["http://localhost:5173", "http://localhost"]` |
| `VITE_API_URL` | Base URL for frontend API calls | *Omit locally to use Vite proxy* |

---

### Docker Compose Quickstart

The fastest way to spin up the entire application (Database, FastAPI Backend, React Frontend):

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ReQuote.git
cd ReQuote

# 2. Configure environment
cp .env.example .env

# 3. Build and launch services in containers
docker compose up --build -d

# 4. Apply database migrations
docker compose exec backend alembic upgrade head
```

Verify services:
- **Frontend SPA**: [http://localhost](http://localhost)
- **FastAPI Interactive Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

To tear down containers:
```bash
docker compose down         # Preserves database volume
docker compose down -v      # Destroys database volume
```

---

### Bare-Metal Local Setup

#### Backend Setup

```bash
cd backend

# Create and activate a Python 3.12 virtual environment
python -m venv .venv
source .venv/bin/activate       # On Linux/macOS
.venv\Scripts\activate          # On Windows

# Install backend dependencies
pip install -r requirements.txt

# Run migrations against your local PostgreSQL instance
alembic upgrade head

# Start development API server with hot-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server with proxy to localhost:8000
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

---

## API Reference & Authentication

All protected endpoints require an `Authorization` header containing a valid bearer token:
```http
Authorization: Bearer <access_token>
```

### Authentication Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/auth/signup` | Create a new user account | Public |
| `POST` | `/auth/login` | Authenticate and obtain JWT access token | Public |
| `GET` | `/auth/me` | Retrieve the authenticated user's profile | Authenticated |

### Quotation Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/quotations` | List quotations with search, status filtering, and pagination | Authenticated |
| `POST` | `/quotations` | Create a new quotation with itemized line deliverables | Authenticated |
| `GET` | `/quotations/{id}` | Retrieve comprehensive details for a quotation | Authenticated |
| `PUT` | `/quotations/{id}` | Update quotation details and line items (drafts only) | Authenticated |
| `DELETE` | `/quotations/{id}` | Permanently delete a quotation | Authenticated |
| `PATCH` | `/quotations/{id}/status`| Advance or modify status (`draft`, `sent`, `accepted`, etc.) | Authenticated |
| `GET` | `/quotations/{id}/pdf` | Generate and stream publication-quality PDF | Authenticated |

### Business Profile & Settings Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/profile` | Retrieve user's configured business branding details | Authenticated |
| `PUT` | `/profile` | Upsert business profile, contact, tax, and quote defaults | Authenticated |

### System & Health Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/health` | Diagnostic probe with DB ping latency in milliseconds | Public |
| `GET` | `/health/ready` | Readiness probe (checks DB connectivity) for cloud platforms | Public |
| `GET` | `/health/live` | Liveness probe returning process status | Public |

#### Example: CLI Authentication & PDF Export
```bash
# 1. Obtain JWT access token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "consultant@example.com", "password": "SecurePassword123!"}' | jq -r .access_token)

# 2. Download quotation PDF directly to file
curl -s -X GET http://localhost:8000/quotations/c9d2f623-1492-49f3-8f08-f4634ceb0f02/pdf \
  -H "Authorization: Bearer $TOKEN" \
  -o quotation.pdf
```

---

## Testing

The project is thoroughly tested across both backend and frontend codebases with a total of **209 automated tests**.

### Backend Test Suite (137 tests)
Runs against an in-memory SQLite database using asynchronous fixtures—no external PostgreSQL instance required:
```bash
cd backend
python -m pytest -v
```

**Coverage Breakdown:**
- `test_models.py` (25 tests): Monetary calculation accuracy, ORM relationship cascading, status validator assertions.
- `test_auth.py` (23 tests): User registration, duplicate email handling, bcrypt verification, JWT claims, expiration.
- `test_api_quotations.py` (62 tests): Quote CRUD, line item arithmetic, multi-tenant ownership isolation, invalid ID rejection.
- `test_pdf.py` (9 tests): PDF byte compilation, dynamic canvas page numbering, custom business header integration.
- `test_production.py` (8 tests): Request payload limits (2MB), security headers, sanitized error responses, health checks.
- `test_profile.py` (10 tests): Profile retrieval, persistence across isolated sessions, schema validations, user ownership scoping.

### Frontend Test Suite (72 tests)
Runs using Vitest, React Testing Library, and jsdom:
```bash
cd frontend
npm test
```

**Coverage Breakdown:**
- Auth forms (LoginForm, SignupForm) and input validations.
- Protected & Public routing gates with JWT session restoration.
- Quotation table filtering, debounced search, and pagination.
- Quotation details, status lifecycle updates, and deletion modals.
- Settings page business profile updates and live preview.

---

## Deployment Architecture

ReQuote is configured for zero-cost production hosting on top of modern developer platforms:

```
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│     Vercel (Frontend SPA)       │      │   Render (FastAPI Web Service)  │
│  - React 18 + Vite Production   │      │  - Python 3.12 Runtime          │
│  - vercel.json SPA Rewrites     ├─────►│  - Alembic auto-migration on boot│
│  - Environment: VITE_API_URL    │      │  - Health Probe: /health/ready  │
└─────────────────────────────────┘      └────────────────┬────────────────┘
                                                          │
                                                          ▼
                                         ┌─────────────────────────────────┐
                                         │  Neon (Serverless PostgreSQL)   │
                                         │  - PostgreSQL 16                │
                                         │  - SSL Required (pool_pre_ping) │
                                         │  - pool_recycle: 1800s          │
                                         └─────────────────────────────────┘
```

1. **Frontend ([Vercel](https://vercel.com))**:
   - Deployed at `https://re-quote.vercel.app/`.
   - Client-side navigation handled via `frontend/vercel.json` rewrite rules.
2. **Backend ([Render](https://render.com))**:
   - Managed Python web service using the root directory `backend`.
   - Configured via [render.yaml](file:///c:/Users/alfre/OneDrive/Desktop/ReQuote/render.yaml) with automatic startup migration:
     `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Readiness check configured to `/health/ready`.
3. **Database ([Neon Serverless Postgres](https://neon.tech))**:
   - Serverless compute with `pool_pre_ping=True` and `pool_recycle=1800` to transparently recover from serverless idle sleep.
   - Connection URL string sanitizer automatically strips unsupported `channel_binding` query parameters for `asyncpg` connections while preserving SSL.

---

## Project Structure

```
ReQuote/
├── .env.example               # Template environment configuration
├── .gitignore                 # Strict ignores for secrets, venvs, and build artifacts
├── docker-compose.yml         # Local 3-service orchestration (db, backend, frontend)
├── render.yaml                # Render Infrastructure-as-Code deployment blueprint
├── README.md                  # System documentation & developer guide
│
├── frontend/                  # React 18 + Vite + TypeScript Client
│   ├── src/
│   │   ├── api/               # Typed Axios HTTP client (auth, quotations, profile)
│   │   ├── components/
│   │   │   ├── auth/          # LoginForm, SignupForm, UserProfileCard
│   │   │   ├── layout/        # Navbar, Footer
│   │   │   ├── quotations/    # QuotationTable, QuotationForm, DashboardMetrics
│   │   │   ├── routes/        # ProtectedRoute, PublicRoute guards
│   │   │   └── ui/            # Button, Input, Card, Alert, ConfirmDialog, StatusBadge
│   │   ├── context/           # AuthContext (JWT lifecycle, login, logout)
│   │   ├── pages/             # HomePage, DashboardPage, QuotationDetailPage, SettingsPage
│   │   ├── types/             # TypeScript domain interfaces (Quotation, Profile, User)
│   │   ├── utils/             # LocalStorage token helpers, currency formatters
│   │   └── App.tsx            # Route tree configuration
│   ├── vercel.json            # Vercel SPA routing redirects
│   ├── vite.config.ts         # Vite build and Vitest configuration
│   └── package.json
│
└── backend/                   # FastAPI + SQLAlchemy Backend
    ├── app/
    │   ├── main.py            # FastAPI entrypoint, middleware, and route registration
    │   ├── config.py          # Pydantic Settings loaded from environment
    │   ├── database.py        # Async engine & sessionmaker with Neon URL adapter
    │   ├── security.py        # Passlib bcrypt hashing & PyJWT token utilities
    │   ├── models/            # SQLAlchemy 2.0 ORM models
    │   │   ├── base.py        # DeclarativeBase with TimestampMixin
    │   │   ├── user.py        # User account model
    │   │   ├── profile.py     # BusinessProfile entity
    │   │   └── quotation.py   # Quotation & QuotationItem entities
    │   ├── schemas/           # Pydantic v2 validation models (In/Out/Update)
    │   │   ├── user.py
    │   │   ├── profile.py
    │   │   └── quotation.py
    │   ├── services/          # Business logic services
    │   │   └── pdf.py         # ReportLab 2-pass NumberedCanvas PDF generator
    │   └── routers/           # Endpoint controllers
    │       ├── auth.py        # Authentication & user profile endpoints
    │       ├── health.py      # Health, liveness, and readiness probes
    │       ├── profile.py     # Business profile endpoints
    │       └── quotations.py  # Quotation CRUD, status, and PDF export endpoints
    ├── alembic/               # Database migration scripts
    │   ├── env.py             # Sync migration runner with URL normalization
    │   └── versions/          # Versioned migration revision files
    ├── tests/                 # Automated Pytest suite
    │   ├── conftest.py        # Async SQLite test engine and authorization fixtures
    │   ├── test_models.py     # Model & financial precision tests
    │   ├── test_auth.py       # Authentication & JWT security tests
    │   ├── test_api_quotations.py # Quotation CRUD & ownership isolation tests
    │   ├── test_pdf.py        # PDF compilation & export tests
    │   ├── test_production.py # Security headers & payload limit tests
    │   └── test_profile.py    # Profile CRUD & persistence tests
    ├── requirements.txt       # Frozen Python dependencies
    └── pytest.ini             # Pytest runtime configuration
```

---

## Security & Production Hardening

- **Payload Size Limits**: Middleware intercepts requests with bodies larger than 2MB and returns `413 Request Entity Too Large` to prevent memory exhaustion attacks.
- **Sanitized Exception Handling**: In production mode (`APP_ENV=production`), unhandled server errors return a generic `{"detail": "An internal server error occurred."}` JSON payload, preventing stack traces or database connection details from leaking.
- **Security Headers**: Every HTTP response automatically includes:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Tenant Isolation**: Cross-tenant data requests yield HTTP `404 Not Found` rather than `403 Forbidden`, mitigating resource existence enumeration attacks.
- **Credential Protection**: Database passwords and JWT secret keys are strictly read from environment variables; `.env` is omitted from version control.

---

## Future Improvements

- **Direct Email Delivery**: Seamless quote delivery to client inboxes with tracking pixels and delivery receipts via Resend or SendGrid.
- **Public Client Approval Portal**: Secure, tokenized public links allowing clients to review, accept, or leave comments on quotations without creating an account.
- **Multi-Currency Live Rates**: Integration with real-time exchange rate feeds for multi-currency invoicing and automatic balance conversion.
- **Recurring Retainers & Templates**: Reusable quotation templates for standard service bundles and automated recurring quotation generation.
- **Webhook Integrations**: Outbound webhook triggers on quotation status changes (`sent`, `accepted`) to integrate with Slack, Linear, or accounting systems.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
