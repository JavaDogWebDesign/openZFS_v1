# Backend Modules Reference

## Module Map

```
backend/
├── main.py              ← FastAPI app entry point, CORS, audit middleware, router mounting
├── config.py            ← Pydantic-settings config (env vars, paths, timeouts)
├── database.py          ← SQLAlchemy async engine, session factory, Base class
├── dependencies.py      ← FastAPI dependencies: get_db, get_current_user (JWT)
│
├── auth/                ← Web UI authentication (separate from system users)
│   ├── models.py        ← AppUser, RevokedToken, AuditLog (SQLAlchemy models)
│   ├── schemas.py       ← LoginRequest, TokenResponse, UserResponse (Pydantic)
│   ├── service.py       ← bcrypt hashing, JWT creation, token revocation, default admin
│   └── router.py        ← POST /login, /refresh, /logout, GET /me
│
├── pools/               ← ZFS pool management
│   ├── schemas.py       ← PoolCreate, PoolResponse, PoolDetailResponse, DiskResponse
│   ├── zfs_executor.py  ← Thin wrappers: zpool_list, zpool_create, zpool_destroy, etc.
│   ├── service.py       ← Business logic: parse output, validate, raise HTTPException
│   └── router.py        ← CRUD endpoints, scrub, import/export, disk listing
│
├── datasets/            ← ZFS datasets and snapshots
│   ├── schemas.py       ← DatasetCreate, SnapshotCreate, CloneCreate
│   ├── service.py       ← Dataset CRUD, properties, snapshot lifecycle, rollback, clone
│   └── router.py        ← Endpoints with {path:path} params for nested datasets
│
├── users/               ← System (Linux) user management
│   ├── schemas.py       ← UserCreate, PasswordChange, GroupUpdate, SmbPasswordSet
│   ├── user_executor.py ← Wrappers: useradd, userdel, chpasswd, smbpasswd, getent
│   ├── service.py       ← Parse /etc/passwd output, filter UID >= 1000, group lookup
│   └── router.py        ← CRUD + password change + SMB password + group management
│
├── shares/              ← SMB and NFS share management
│   ├── models.py        ← NFSExport SQLAlchemy model (ID tracking for exports)
│   ├── schemas.py       ← SMBShareCreate/Response, NFSExportCreate/Response
│   ├── smb_manager.py   ← Parse/write /etc/samba/openzfs-shares.conf (atomic writes)
│   ├── nfs_manager.py   ← CRUD in SQLite + sync to /etc/exports.d/openzfs.exports
│   ├── service.py       ← Orchestrates smb_manager and nfs_manager
│   └── router.py        ← SMB and NFS endpoints under /shares/smb and /shares/nfs
│
├── websockets/          ← Real-time pool status updates
│   ├── manager.py       ← ConnectionManager: track active WS connections, broadcast
│   ├── tasks.py         ← Background coroutine: poll zpool list, broadcast to clients
│   └── router.py        ← WS endpoint /ws/pool-status, auto-starts broadcaster
│
└── utils/               ← Shared utilities
    ├── command.py       ← Safe subprocess runner (allowlist, no shell, null byte check)
    ├── validators.py    ← Regex validators for pool names, paths, usernames, etc.
    └── parsers.py       ← Parse zpool list/status, zfs list/get, lsblk JSON output
```

---

## config.py

Central configuration via `pydantic-settings`. All values are overridable with `OPENZFS_` prefixed environment variables or a `.env` file.

| Setting | Default | Description |
|---------|---------|-------------|
| `secret_key` | (placeholder) | JWT signing key — **must** override in production |
| `database_url` | `sqlite+aiosqlite:///./openzfs.db` | SQLAlchemy async database URL |
| `access_token_expire_minutes` | 30 | JWT access token lifetime |
| `refresh_token_expire_days` | 7 | JWT refresh token lifetime |
| `cors_origins` | `["http://localhost:5173"]` | Allowed CORS origins (dev only) |
| `ws_pool_status_interval` | 5 | Seconds between WebSocket pool broadcasts |
| `command_timeout` | 30 | Default subprocess timeout in seconds |
| `zpool_cmd` | `/usr/sbin/zpool` | Absolute path to zpool binary |
| `zfs_cmd` | `/usr/sbin/zfs` | Absolute path to zfs binary |
| `smb_include_file` | `/etc/samba/openzfs-shares.conf` | Managed Samba config file |
| `nfs_exports_file` | `/etc/exports.d/openzfs.exports` | Managed NFS exports file |

---

## database.py

- Uses `create_async_engine` with `aiosqlite` driver
- `async_sessionmaker` configured with `expire_on_commit=False`
- `get_db()` is a FastAPI dependency that yields a session, commits on success, rolls back on exception
- `init_db()` calls `Base.metadata.create_all` at startup (auto-creates tables)

### SQLite Tables

| Table | Purpose | Module |
|-------|---------|--------|
| `app_users` | Web UI login accounts (username, bcrypt hash, is_admin) | auth/models.py |
| `revoked_tokens` | JWT tokens invalidated on logout | auth/models.py |
| `audit_log` | Tracks all mutating API operations | auth/models.py |
| `nfs_exports` | ID-mapped NFS exports (since exports files have no IDs) | shares/models.py |

---

## utils/command.py — Safe Command Execution

The most critical security component. All system commands go through `run_command()`.

### Safety guarantees:
1. **Allowlist only** — only commands in `ALLOWED_COMMANDS` dict can execute
2. **Absolute paths** — executables resolved to full paths (`/usr/sbin/zpool`, not `zpool`)
3. **No `shell=True`** — uses `asyncio.create_subprocess_exec` with list args
4. **Null byte rejection** — args are scanned for `\x00` before execution
5. **Timeout enforcement** — `asyncio.wait_for` with configurable timeout
6. **Structured result** — returns `CommandResult(returncode, stdout, stderr)`

### Allowed commands:
`zpool`, `zfs`, `useradd`, `userdel`, `usermod`, `passwd`, `chpasswd`, `smbpasswd`, `getent`, `exportfs`, `systemctl`, `lsblk`

---

## utils/validators.py — Input Validation

Regex-based validators prevent injection through crafted names/paths.

| Validator | Pattern | Example Valid Input |
|-----------|---------|-------------------|
| `validate_pool_name` | `^[a-zA-Z][a-zA-Z0-9_.\-]{0,63}$` | `mypool`, `tank-01` |
| `validate_dataset_path` | Pool name rules, `/`-separated | `tank/data/photos` |
| `validate_snapshot_name` | `^[a-zA-Z0-9_.\-]{1,64}$` | `daily-2024-01-15` |
| `validate_username` | `^[a-z_][a-z0-9_\-]{0,31}$` | `john`, `svc_backup` |
| `validate_share_name` | `^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,63}$` | `photos`, `dept-data` |
| `validate_fs_path` | `^/[a-zA-Z0-9_.\-/]+$` + no `..` | `/mnt/tank/share` |
| `validate_nfs_client` | `^[a-zA-Z0-9.*_\-/]+$` | `192.168.1.0/24`, `*` |

All validators also reject null bytes.

---

## utils/parsers.py — ZFS Output Parsing

Parsers convert tab-separated ZFS CLI output into structured dicts.

| Parser | Input Command | Output |
|--------|--------------|--------|
| `parse_zpool_list` | `zpool list -Hp` | `[{name, size, allocated, free, health, ...}]` |
| `parse_zpool_status` | `zpool status <pool>` | `{name, state, status, scan, config: [vdevs], errors}` |
| `parse_zfs_list` | `zfs list -Hp -o name,used,avail,...` | `[{name, used, available, mountpoint, type}]` |
| `parse_zfs_get` | `zfs get -Hp all <dataset>` | `{property_name: value, ...}` |
| `parse_snapshot_list` | `zfs list -t snapshot -Hp ...` | `[{full_name, dataset, name, used, creation}]` |
| `parse_lsblk` | `lsblk -Jb` | `[{name, path, size, model, partitions[], in_use}]` |

---

## auth/ — Authentication Module

### How it works:
- **App users** are stored in SQLite (`app_users` table), separate from Linux system users
- **Passwords** are hashed with bcrypt via passlib
- **JWT tokens** are signed with HS256 using the configured `secret_key`
- **Token rotation**: on refresh, old refresh token is revoked, new pair issued
- **Default admin**: on first startup, creates `admin`/`admin` if no users exist

### Token types:
- `access` — short-lived (30min), used in `Authorization: Bearer` header
- `refresh` — long-lived (7d), used only for `/auth/refresh` endpoint

### `get_current_user` dependency:
1. Extract token from `Authorization: Bearer <token>` header
2. Decode JWT, verify `type == "access"` and not expired
3. Check token not in `revoked_tokens` table
4. Load `AppUser` by ID from database
5. Raise `401` at any failure point

---

## pools/ — ZFS Pool Management

### Layer separation:
- **router.py** — HTTP endpoints, parameter extraction, auth dependency
- **service.py** — Business logic, validation, error handling (raises HTTPException)
- **zfs_executor.py** — Thin command wrappers (no logic, just build args and call `run_command`)

### Key operations:
| Endpoint | ZFS Command | Notes |
|----------|-------------|-------|
| `GET /pools` | `zpool list -Hp` | Returns all pools with size/health |
| `GET /pools/{name}` | `zpool status <name>` | Parsed vdev tree with error counts |
| `POST /pools` | `zpool create [-o k=v] name [type] disk...` | vdev_type: stripe, mirror, raidz, raidz2, raidz3 |
| `DELETE /pools/{name}` | `zpool destroy -f <name>` | Force destroy |
| `POST /pools/{name}/scrub` | `zpool scrub <name>` | Start background scrub |
| `GET /pools/disks` | `lsblk -Jb --output ...` | JSON output, filtered to type=disk |

---

## datasets/ — Dataset & Snapshot Management

### Dataset operations:
| Endpoint | ZFS Command |
|----------|-------------|
| `GET /datasets?pool=X` | `zfs list -Hp -o name,used,avail,refer,mountpoint,type [-r pool]` |
| `POST /datasets` | `zfs create [-o k=v] <name>` |
| `PATCH /datasets/{path}` | `zfs set key=value <path>` (per property) |
| `DELETE /datasets/{path}` | `zfs destroy -r <path>` |

### Snapshot operations:
| Endpoint | ZFS Command |
|----------|-------------|
| `GET /datasets/{path}/snapshots` | `zfs list -t snapshot -Hp -o name,used,refer,creation -r <path>` |
| `POST /datasets/{path}/snapshots` | `zfs snapshot <path>@<name>` |
| `DELETE /datasets/{path}/snapshots/{snap}` | `zfs destroy <path>@<snap>` |
| `POST /.../snapshots/{snap}/rollback` | `zfs rollback -r <path>@<snap>` |
| `POST /.../snapshots/{snap}/clone` | `zfs clone <path>@<snap> <target>` |

**Note:** Dataset paths use `{path:path}` route parameters to support `/`-separated paths like `tank/data/photos`.

---

## users/ — System User Management

Manages Linux system users (not web UI users).

### Layer design:
- **user_executor.py** — wraps `useradd`, `userdel`, `usermod`, `chpasswd`, `smbpasswd`, `getent`
- **service.py** — parses `/etc/passwd` format output, filters to UID >= 1000 (regular users), resolves group membership

### Password handling:
- System password: piped via stdin to `chpasswd` (format: `username:password`)
- Samba password: piped via stdin to `smbpasswd -a -s` (format: `password\npassword\n`)

### User listing:
1. `getent passwd` → parse each line (colon-separated: `user:x:uid:gid:gecos:home:shell`)
2. Filter UID >= 1000, exclude UID 65534 (nobody)
3. `getent group` → find which groups each user belongs to

---

## shares/ — SMB and NFS Share Management

### SMB (Samba)
- **Config strategy**: App manages a separate include file (`/etc/samba/openzfs-shares.conf`)
- Main `smb.conf` has a single `include =` line added during install
- **Atomic writes**: write to temp file in same directory, then `os.rename()` (atomic on same filesystem)
- **Parsing**: reads INI-style `[section]` format, handles Samba booleans (`yes`/`no`)
- **Reload**: `systemctl reload smbd`

### NFS
- **Config strategy**: App writes to `/etc/exports.d/openzfs.exports` (modular include directory)
- **ID tracking**: NFS exports have no inherent ID, so entries are tracked in SQLite (`nfs_exports` table)
- **Sync**: after any CRUD operation, the exports file is regenerated from database state
- **Reload**: `exportfs -ra`

### Why this design:
- Preserves any manual admin config in `smb.conf` / `/etc/exports`
- App only manages its own file — won't corrupt existing shares
- Atomic writes prevent partial configs that could crash services

---

## websockets/ — Real-Time Updates

### How it works:
1. Client connects to `ws://host/api/v1/ws/pool-status`
2. `ConnectionManager` accepts and tracks the connection
3. On first connection, a background `asyncio.Task` starts the broadcaster
4. Broadcaster runs `zpool list -Hp` every N seconds (configurable via `ws_pool_status_interval`)
5. Parsed pool data is broadcast as JSON to all connected clients
6. Disconnected clients are automatically cleaned up

### Message format:
```json
{
  "type": "pool_status",
  "pools": [
    {"name": "tank", "size": 1099511627776, "health": "ONLINE", ...}
  ]
}
```

---

## Audit Middleware

HTTP middleware in `main.py` that logs all `POST`, `PUT`, `PATCH`, `DELETE` requests to the `audit_log` table.

### Logged fields:
- `action`: `"{METHOD} {path}"` (e.g., `"DELETE /api/v1/pools/tank"`)
- `resource`: request URL path
- `detail`: response status code
- `timestamp`: server time

### Design:
- Runs after the response is generated (so status code is available)
- Fire-and-forget: logging errors are caught and warned, never block the response
- Uses a separate database session to avoid interfering with the request's transaction
