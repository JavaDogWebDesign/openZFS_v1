# API Reference

All endpoints are under `/api/v1`. All endpoints except `/auth/login`, `/auth/refresh`, and `/health` require a valid JWT access token in the `Authorization: Bearer <token>` header.

---

## Health Check

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Returns `{"status": "ok"}` |

---

## Auth (`/auth`)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/auth/login` | No | `{ username, password }` | `{ access_token, refresh_token, token_type }` |
| `POST` | `/auth/refresh` | No | `{ refresh_token }` | `{ access_token, refresh_token, token_type }` |
| `POST` | `/auth/logout` | Yes | `{ refresh_token }` | `{ detail }` |
| `GET` | `/auth/me` | Yes | — | `{ id, username, is_admin, is_active, created_at }` |

### Notes:
- Login returns a JWT pair (access 30min + refresh 7d)
- Refresh performs token rotation: old refresh token is revoked, new pair issued
- Logout revokes the refresh token (access token expires naturally)

---

## Pools (`/pools`)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/pools` | Yes | — | `[{ name, size, allocated, free, fragmentation, capacity, dedupratio, health }]` |
| `GET` | `/pools/disks` | Yes | — | `[{ name, path, size, model, serial, partitions[], in_use }]` |
| `GET` | `/pools/{name}` | Yes | — | `{ name, state, status, scan, config: [vdevs], errors }` |
| `POST` | `/pools` | Yes | `{ name, vdev_type, disks[], properties{} }` | Pool detail (same as GET detail) |
| `DELETE` | `/pools/{name}` | Yes | — | `{ detail }` |
| `POST` | `/pools/{name}/scrub` | Yes | — | `{ detail }` |
| `DELETE` | `/pools/{name}/scrub` | Yes | — | `{ detail }` |
| `POST` | `/pools/{name}/export` | Yes | — | `{ detail }` |
| `POST` | `/pools/{name}/import` | Yes | — | `{ detail }` |

### Pool create `vdev_type` values:
- `stripe` — no redundancy (JBOD)
- `mirror` — n-way mirror
- `raidz` — single parity (like RAID5)
- `raidz2` — double parity (like RAID6)
- `raidz3` — triple parity

### Pool detail `config` structure:
```json
[
  {
    "name": "mirror-0",
    "state": "ONLINE",
    "read": "0", "write": "0", "checksum": "0",
    "children": [
      { "name": "sda", "state": "ONLINE", "read": "0", "write": "0", "checksum": "0" },
      { "name": "sdb", "state": "ONLINE", "read": "0", "write": "0", "checksum": "0" }
    ]
  }
]
```

---

## Datasets (`/datasets`)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/datasets?pool=X` | Yes | — | `[{ name, used, available, referenced, mountpoint, type }]` |
| `POST` | `/datasets` | Yes | `{ name, properties{} }` | `{ name, detail }` |
| `PATCH` | `/datasets/{path}` | Yes | `{ properties{} }` | `{ name, detail }` |
| `DELETE` | `/datasets/{path}` | Yes | — | `{ detail }` |

### Snapshots (`/datasets/{path}/snapshots`)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/datasets/{path}/snapshots` | Yes | — | `[{ full_name, dataset, name, used, referenced, creation }]` |
| `POST` | `/datasets/{path}/snapshots` | Yes | `{ name }` | `{ full_name, detail }` |
| `DELETE` | `/datasets/{path}/snapshots/{snap}` | Yes | — | `{ detail }` |
| `POST` | `/datasets/{path}/snapshots/{snap}/rollback` | Yes | — | `{ detail }` |
| `POST` | `/datasets/{path}/snapshots/{snap}/clone` | Yes | `{ target }` | `{ detail }` |

### Notes:
- `{path}` supports slashes for nested datasets (e.g., `tank/data/photos`)
- `pool` query parameter on `GET /datasets` filters to datasets within that pool (`zfs list -r pool`)
- Properties dict keys are ZFS property names (e.g., `compression`, `quota`, `atime`)
- Clone target must be a valid dataset path (e.g., `tank/clone-name`)

---

## Users (`/users`)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/users` | Yes | — | `[{ username, uid, gid, home, shell, groups[] }]` |
| `POST` | `/users` | Yes | `{ username, password, groups[] }` | `{ username, detail }` |
| `DELETE` | `/users/{username}` | Yes | — | `{ detail }` |
| `PATCH` | `/users/{username}/password` | Yes | `{ password }` | `{ detail }` |
| `PATCH` | `/users/{username}/groups` | Yes | `{ groups[] }` | `{ detail }` |
| `POST` | `/users/{username}/smb-password` | Yes | `{ password }` | `{ detail }` |

### Notes:
- These manage **system (Linux) users**, not web UI accounts
- User listing only returns regular users (UID >= 1000)
- Groups are set via `usermod -G` (replaces supplementary groups)
- SMB password is set via `smbpasswd -a -s` (adds user to Samba if not present)

---

## Shares (`/shares`)

### SMB Shares (`/shares/smb`)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/shares/smb` | Yes | — | `[{ name, path, comment, browseable, read_only, guest_ok, valid_users[] }]` |
| `POST` | `/shares/smb` | Yes | `{ name, path, comment?, browseable?, read_only?, guest_ok?, valid_users[]? }` | Share object |
| `PATCH` | `/shares/smb/{name}` | Yes | Partial share fields | Updated share object |
| `DELETE` | `/shares/smb/{name}` | Yes | — | `{ detail }` |
| `POST` | `/shares/smb/reload` | Yes | — | `{ detail }` |

### NFS Exports (`/shares/nfs`)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/shares/nfs` | Yes | — | `[{ id, path, client, options }]` |
| `POST` | `/shares/nfs` | Yes | `{ path, client?, options? }` | Export object |
| `PATCH` | `/shares/nfs/{id}` | Yes | `{ client?, options? }` | Updated export object |
| `DELETE` | `/shares/nfs/{id}` | Yes | — | `{ detail }` |
| `POST` | `/shares/nfs/reload` | Yes | — | `{ detail }` |

### Notes:
- SMB reload calls `systemctl reload smbd`
- NFS reload calls `exportfs -ra`
- Default NFS client is `*` (all hosts), default options are `rw,sync,no_subtree_check`

---

## WebSocket (`/ws`)

| Path | Protocol | Description |
|------|----------|-------------|
| `/ws/pool-status` | WebSocket | Real-time pool status updates |

### Connection:
```javascript
const ws = new WebSocket('ws://host/api/v1/ws/pool-status');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type === 'pool_status'
  // data.pools === [{name, size, allocated, free, health, ...}]
};
```

### Behavior:
- Server broadcasts pool status every 5 seconds (configurable)
- Broadcaster only runs when at least one client is connected
- No authentication required on the WebSocket itself (protected by nginx in production)
