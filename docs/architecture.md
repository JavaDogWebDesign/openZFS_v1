# OpenZFS Manager — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│  React 19 + TypeScript + Tailwind CSS + React Query     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / WebSocket
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Nginx (port 80/443)                   │
│  - Serves static frontend from /opt/.../frontend/dist   │
│  - Proxies /api/* to uvicorn on 127.0.0.1:8000          │
│  - Proxies /api/v1/ws/* with WebSocket upgrade           │
│  - SPA fallback: try_files → /index.html                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI (uvicorn, port 8000)                │
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐     │
│  │  Auth   │ │  Pools  │ │ Datasets │ │  Users  │     │
│  │ Module  │ │ Module  │ │  Module  │ │ Module  │     │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └────┬────┘     │
│       │           │           │             │           │
│  ┌────┴────┐ ┌────┴────┐ ┌───┴──┐   ┌─────┴─────┐    │
│  │ Shares  │ │   WS    │ │Audit │   │   Utils   │    │
│  │ Module  │ │ Module  │ │Middlw│   │(cmd,valid,│    │
│  └─────────┘ └─────────┘ └──────┘   │  parsers) │    │
│                                       └───────────┘    │
└──────┬──────────┬──────────┬──────────┬────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
  ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
  │ SQLite  │ │ zpool  │ │useradd │ │ smb.conf   │
  │  (data) │ │ zfs    │ │userdel │ │ exports.d/ │
  └─────────┘ │ lsblk  │ │chpasswd│ │ exportfs   │
              └────────┘ │smbpasswd└─┘ systemctl  │
                         └────────────────────────┘
```

## Request Flow

1. **Browser** sends HTTP request to nginx (port 80)
2. **Nginx** proxies `/api/*` requests to FastAPI on `127.0.0.1:8000`
3. **FastAPI** middleware runs audit logging for mutating requests
4. **Router** extracts path/query params, validates request body via Pydantic schemas
5. **Dependency injection** resolves `get_current_user` (JWT validation) and `get_db` (SQLAlchemy session)
6. **Service layer** implements business logic, calls executor functions
7. **Executor/Manager** runs system commands via `utils/command.py` (allowlisted, no shell=True)
8. **Response** flows back through the chain as JSON

## Authentication Flow

```
Login:
  POST /api/v1/auth/login { username, password }
    → bcrypt verify against app_users table
    → return { access_token (30min), refresh_token (7d) }

Authenticated Request:
  GET /api/v1/pools  [Authorization: Bearer <access_token>]
    → JWT decode → extract user_id → check revoked_tokens → load AppUser
    → if expired 401 → frontend interceptor calls /auth/refresh

Token Refresh:
  POST /api/v1/auth/refresh { refresh_token }
    → validate refresh JWT → check not revoked → revoke old refresh token
    → issue new access + refresh pair (rotation)

Logout:
  POST /api/v1/auth/logout { refresh_token }
    → add refresh_token to revoked_tokens table
```

## Data Flow Diagram

```
Frontend (React Query)          Backend (FastAPI)              System
─────────────────────           ─────────────────              ──────
useQuery('pools')
  → GET /api/v1/pools ────────→ pools.router
                                  → pools.service.list_pools()
                                    → zfs_executor.zpool_list()
                                      → command.run_command('zpool', ['list','-Hp'])
                                        → asyncio.create_subprocess_exec ──→ /usr/sbin/zpool
                                      ← CommandResult(stdout, stderr, rc)
                                    ← parsers.parse_zpool_list(stdout)
                                  ← [PoolResponse, ...]
  ← JSON array ←──────────────

useMutation(createPool)
  → POST /api/v1/pools ──────→ pools.router
                                  → Pydantic schema validation
                                  → pools.service.create_pool()
                                    → zfs_executor.zpool_create()
                                      → run_command('zpool',['create',...])
                                        → asyncio.create_subprocess_exec ──→ /usr/sbin/zpool create ...
                                    → zfs_executor.zpool_status()  (return detail)
                                  ← PoolDetailResponse
  ← JSON ←────────────────────
  → queryClient.invalidateQueries(['pools'])  (auto-refetch)
```
