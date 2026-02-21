# Security Design

## Threat Model

OpenZFS Manager runs as root (required for ZFS/user/share management) and exposes a web interface. The primary security concern is preventing unauthorized command execution through the web interface.

## Defense Layers

### 1. Authentication (JWT)

- All API endpoints (except login/refresh/health) require a valid JWT
- Tokens are signed with HS256 using a 256-bit random secret
- Access tokens expire in 30 minutes, refresh tokens in 7 days
- Token rotation on refresh (old refresh token revoked)
- Revoked tokens tracked in database (logout invalidation)

### 2. Command Execution Allowlist

The most critical security boundary. `utils/command.py` enforces:

- **Allowlisted executables only**: Only 12 specific commands can be executed, each mapped to an absolute path
- **No `shell=True`**: Uses `asyncio.create_subprocess_exec` with list arguments, preventing shell injection
- **Null byte rejection**: All arguments are scanned for `\x00` before execution
- **Timeouts**: Every subprocess call has a configurable timeout (default 30s)

```python
ALLOWED_COMMANDS = {
    "zpool":     "/usr/sbin/zpool",
    "zfs":       "/usr/sbin/zfs",
    "useradd":   "/usr/sbin/useradd",
    "userdel":   "/usr/sbin/userdel",
    "usermod":   "/usr/sbin/usermod",
    "passwd":    "/usr/bin/passwd",
    "chpasswd":  "/usr/sbin/chpasswd",
    "smbpasswd": "/usr/bin/smbpasswd",
    "getent":    "/usr/bin/getent",
    "exportfs":  "/usr/sbin/exportfs",
    "systemctl": "/usr/bin/systemctl",
    "lsblk":     "/usr/bin/lsblk",
}
```

### 3. Input Validation

All user-supplied names/paths are validated against strict regex patterns before they reach any command executor:

| Input | Pattern | Rejects |
|-------|---------|---------|
| Pool name | `^[a-zA-Z][a-zA-Z0-9_.\-]{0,63}$` | Spaces, special chars, shell metacharacters |
| Dataset path | Pool name rules, `/`-separated | `..`, absolute paths, injection |
| Username | `^[a-z_][a-z0-9_\-]{0,31}$` | Uppercase, special chars, long names |
| Share name | `^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,63}$` | Spaces, special chars |
| FS path | `^/[a-zA-Z0-9_.\-/]+$` + no `..` | Path traversal, injection |

Validation happens at two levels:
- **Pydantic schemas** with `@field_validator` on request deserialization
- **Service layer** re-validates before command execution

### 4. Configuration Isolation

- **Samba**: App manages `/etc/samba/openzfs-shares.conf` (separate include file), never touches the main `smb.conf`
- **NFS**: App manages `/etc/exports.d/openzfs.exports` (modular include), never touches `/etc/exports`
- **Atomic writes**: Config files are written to a temp file first, then atomically renamed

### 5. Network Exposure

- **FastAPI binds to `127.0.0.1:8000` only** — not reachable from the network
- **Nginx** is the only externally-facing service
- **CORS** is disabled in production (empty origins list) since nginx serves everything from one origin
- **WebSocket** has no auth — acceptable because it's read-only pool status and only accessible through nginx

### 6. Systemd Hardening

The service file includes several systemd security directives:

```ini
ProtectSystem=strict          # Read-only filesystem except ReadWritePaths
ReadWritePaths=/opt/openzfs-manager/data /etc/samba /etc/exports.d /home
ProtectHome=false             # Needed for user home directory operations
NoNewPrivileges=false         # Must be false — ZFS/user commands need root
PrivateTmp=true               # Isolate /tmp
```

### 7. Audit Trail

All mutating API requests (`POST`, `PUT`, `PATCH`, `DELETE`) are logged to the `audit_log` table with:
- HTTP method and path
- Response status code
- Timestamp

## What This Does NOT Protect Against

- **Physical access** to the server
- **Compromised JWT secret key** — attacker could forge tokens
- **Root-level OS access** — if someone gets a shell, the app can't help
- **SQLite corruption** from disk failure — use ZFS for the data directory if possible
- **Brute force login** — no rate limiting on `/auth/login` (add in production with nginx `limit_req`)

## Recommendations for Production

1. **Change the default admin password immediately** after install
2. **Use HTTPS** — configure TLS in nginx
3. **Restrict network access** — firewall the management interface to admin IPs only
4. **Add rate limiting** to nginx for `/api/v1/auth/login`
5. **Backup the JWT secret** — losing it invalidates all sessions
6. **Monitor audit logs** — periodically review the `audit_log` table
7. **Keep packages updated** — `apt update && apt upgrade` regularly
