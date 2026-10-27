# ReQuote

Professional quote estimation and management platform.

## Tech Stack

| Layer       | Technology                     |
|-------------|-------------------------------|
| Frontend    | React 18 · Vite · TypeScript  |
| Backend     | Python 3.12 · FastAPI          |
| Database    | PostgreSQL 16                  |
| Container   | Docker · Docker Compose        |

## Project Structure

```
ReQuote/
├── frontend/           # React + Vite + TypeScript SPA
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/            # FastAPI application
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   └── routers/
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## Getting Started

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x
- Docker Compose v2 (bundled with Docker Desktop)

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set a strong POSTGRES_PASSWORD
```

### 3. Build and start

```bash
docker compose up --build
```

### 4. Verify services

| Service  | URL                              | Description              |
|----------|----------------------------------|--------------------------|
| Frontend | http://localhost                 | React SPA                |
| API docs | http://localhost:8000/docs       | FastAPI Swagger UI       |
| Health   | http://localhost:8000/health     | Health + DB status check |

### 5. Stop

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

## Development Notes

- Backend environment variables are loaded from `.env` via Pydantic Settings.
- The frontend Nginx config proxies `/api/*` to the FastAPI backend.
- The `db` service must pass its healthcheck before the `backend` starts.
- Actual `.env` files are excluded by `.gitignore` — never commit them.

## Roadmap

- [ ] Phase 2: Authentication (JWT)
- [ ] Phase 3: Quote models & CRUD API
- [ ] Phase 4: AI-assisted quote generation
- [ ] Phase 5: CI/CD pipeline
