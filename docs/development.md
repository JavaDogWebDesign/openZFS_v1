# Development Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+

## Setup

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The backend auto-creates the SQLite database and a default admin user (`admin`/`admin`) on first startup.

**API docs** are available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server (with API proxy to backend)
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api/*` requests to `http://localhost:8000`.

## Project Layout

```
openZFS_v1/
├── backend/          ← Python FastAPI application
├── frontend/         ← React TypeScript application
├── deploy/           ← Deployment artifacts (systemd, nginx, install script)
└── docs/             ← This documentation
```

## Environment Variables

For development, create a `.env` file in the backend directory:

```env
OPENZFS_DEBUG=true
OPENZFS_SECRET_KEY=dev-secret-key-not-for-production
OPENZFS_CORS_ORIGINS=["http://localhost:5173"]
```

## Running Without ZFS

The backend will start fine on any system (macOS, Linux without ZFS). API calls that invoke ZFS commands will return errors, but the auth system, database, and API structure all work.

This is useful for frontend development — you can log in, navigate pages, and test forms. API calls to ZFS/user/share endpoints will fail gracefully.

## Code Organization Conventions

### Backend

- **router.py** — HTTP endpoints only. Extracts params, calls service, returns response.
- **service.py** — Business logic. Validates input, calls executors, handles errors.
- **schemas.py** — Pydantic models for request/response validation.
- **executor/manager** — System command wrappers. No business logic, just build args and call `run_command`.
- **models.py** — SQLAlchemy ORM models (only in modules that use the database).

### Frontend

- **api/** — One file per backend module. Each exports typed async functions.
- **pages/** — One component per route. Contains query/mutation logic and layout.
- **components/** — Reusable UI pieces. Receive data via props, emit events via callbacks.
- **types/** — Shared TypeScript interfaces matching backend schemas.

## Testing

### Backend
```bash
cd backend
pytest tests/ -v
```

Tests should mock `utils/command.run_command` to avoid requiring actual ZFS installations. Example:

```python
from unittest.mock import AsyncMock, patch
from backend.utils.command import CommandResult

@patch('backend.pools.zfs_executor.run_command')
async def test_list_pools(mock_cmd):
    mock_cmd.return_value = CommandResult(
        returncode=0,
        stdout="tank\t1099511627776\t549755813888\t549755813888\t-\t-\t5%\t50%\t1.00x\tONLINE\t-\n",
        stderr=""
    )
    # ... test pool listing
```

### Frontend
```bash
cd frontend
npx vitest
```

## Adding a New Module

1. Create directory: `backend/newmodule/`
2. Add `__init__.py`, `router.py`, `schemas.py`, `service.py`
3. If it needs DB: add `models.py`, import models in `alembic/env.py`
4. If it runs commands: add executor file, register commands in `utils/command.py` `ALLOWED_COMMANDS`
5. Mount router in `main.py`: `app.include_router(router, prefix="/api/v1/newmodule")`
6. Add frontend: `api/newmodule.ts`, types in `types/index.ts`, page + components
7. Add route in `App.tsx`
