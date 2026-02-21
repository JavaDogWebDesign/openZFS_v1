# Frontend Modules Reference

## Module Map

```
frontend/src/
├── main.tsx                         ← Entry point: renders <App /> into #root
├── App.tsx                          ← Router + QueryClientProvider + AuthProvider
├── index.css                        ← Tailwind directives (@tailwind base/components/utilities)
│
├── api/                             ← HTTP client layer
│   ├── client.ts                    ← Axios instance, auth interceptor, token refresh
│   ├── auth.ts                      ← login, logout, refresh, getMe
│   ├── pools.ts                     ← listPools, getPool, createPool, destroyPool, scrub, disks
│   ├── datasets.ts                  ← listDatasets, create/update/destroy, snapshots, rollback, clone
│   ├── users.ts                     ← listUsers, createUser, deleteUser, passwords, groups
│   └── shares.ts                    ← SMB: list/create/update/delete/reload, NFS: same
│
├── context/
│   └── AuthContext.tsx               ← Auth state (user, login, logout), token persistence
│
├── hooks/
│   └── useWebSocket.ts              ← Real-time pool status via WebSocket
│
├── types/
│   └── index.ts                     ← All TypeScript interfaces (Pool, Dataset, User, Share, etc.)
│
├── utils/
│   └── format.ts                    ← formatBytes, formatDate, healthColor
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx            ← Sidebar + Header + <Outlet /> (main shell)
│   │   ├── Sidebar.tsx              ← Navigation links with icons
│   │   └── Header.tsx               ← Username display + logout button
│   │
│   ├── common/
│   │   ├── ProtectedRoute.tsx       ← Redirects to /login if not authenticated
│   │   ├── ConfirmDialog.tsx        ← Modal for destructive action confirmation
│   │   └── DataTable.tsx            ← Generic table component (columns + data)
│   │
│   ├── pools/
│   │   ├── PoolList.tsx             ← Table of pools with scrub/destroy actions
│   │   ├── PoolCreateForm.tsx       ← Form: name, vdev type, disk selection
│   │   └── DiskUsageChart.tsx       ← Recharts pie chart (used vs free)
│   │
│   ├── datasets/
│   │   ├── DatasetList.tsx          ← Table of datasets with snapshot/destroy actions
│   │   ├── DatasetCreateForm.tsx    ← Form: path, compression, quota
│   │   └── SnapshotList.tsx         ← Table of snapshots with rollback/clone/destroy
│   │
│   ├── users/
│   │   ├── UserList.tsx             ← Table of system users with SMB pass/delete actions
│   │   └── UserCreateForm.tsx       ← Form: username, password, groups
│   │
│   └── shares/
│       ├── ShareList.tsx            ← Tabbed view (SMB / NFS) with delete actions
│       ├── SMBShareForm.tsx         ← Form: name, path, browseable, read only, guest, valid users
│       └── NFSExportForm.tsx        ← Form: path, client, options
│
└── pages/
    ├── LoginPage.tsx                ← Login form, calls useAuth().login
    ├── DashboardPage.tsx            ← Stats cards + storage overview + pool health list
    ├── PoolsPage.tsx                ← Pool CRUD with create form + confirm dialog
    ├── PoolDetailPage.tsx           ← Pool info, disk usage chart, vdev config tree
    ├── DatasetsPage.tsx             ← Dataset CRUD + snapshot browser
    ├── UsersPage.tsx                ← System user CRUD + SMB password
    └── SharesPage.tsx               ← SMB/NFS share CRUD with tabbed interface
```

---

## api/client.ts — Axios Client

Central HTTP client used by all API modules.

### Request interceptor:
- Reads `access_token` from `localStorage`
- Attaches as `Authorization: Bearer <token>` header

### Response interceptor (401 handling):
1. On 401 response (and not already retrying):
2. Read `refresh_token` from localStorage
3. Call `POST /api/v1/auth/refresh` (direct axios, not through interceptor)
4. Store new token pair in localStorage
5. Retry original request with new access token
6. If refresh fails → clear tokens, redirect to `/login`

This makes token refresh completely transparent to the rest of the app.

---

## context/AuthContext.tsx — Authentication State

Provides `useAuth()` hook with:

| Field | Type | Description |
|-------|------|-------------|
| `user` | `AppUser \| null` | Current logged-in user, or null |
| `isLoading` | `boolean` | True while checking stored token on mount |
| `login(username, password)` | `async function` | Calls API, stores tokens, fetches user |
| `logout()` | `async function` | Calls API logout, clears tokens, sets user null |

### Startup flow:
1. Check localStorage for `access_token`
2. If present, call `GET /api/v1/auth/me` to validate
3. On success → set user state
4. On failure → clear tokens (they're expired/invalid)
5. Set `isLoading = false`

---

## hooks/useWebSocket.ts — Real-Time Pool Status

Returns `{ pools, connected }`.

### Connection lifecycle:
1. Determines protocol (`ws:` or `wss:` based on page protocol)
2. Connects to `/api/v1/ws/pool-status`
3. On message, parses JSON and updates `pools` state
4. On disconnect, auto-reconnects after 3 seconds
5. Cleans up WebSocket on component unmount

---

## Page Architecture

All pages follow a consistent pattern:

```
Page Component
  ├── useQuery (fetch data via React Query)
  ├── useMutation (create/update/delete operations)
  ├── Local state (showCreate form, confirmDialog target)
  ├── Event handlers (wire mutations to user actions)
  └── JSX
       ├── Header row (title + action buttons)
       ├── Create form (conditionally shown)
       ├── Data list/table component
       └── ConfirmDialog (for destructive actions)
```

### React Query usage:
- **Queries**: `useQuery({ queryKey: ['pools'], queryFn: listPools })`
  - Auto-refetches on window focus
  - 10 second stale time (avoids re-fetching on quick navigation)
  - 1 retry on failure
- **Mutations**: `useMutation({ mutationFn: ..., onSuccess: () => queryClient.invalidateQueries(...) })`
  - On success, invalidates related queries to trigger refetch
  - `isPending` state drives form submit button disabled state

---

## Routing Structure

```
/login              → LoginPage (public)
/                   → DashboardPage (protected)
/pools              → PoolsPage (protected)
/pools/:name        → PoolDetailPage (protected)
/datasets           → DatasetsPage (protected)
/users              → UsersPage (protected)
/shares             → SharesPage (protected)
```

All routes except `/login` are wrapped in `ProtectedRoute`, which checks `useAuth().user` and redirects to `/login` if null.

The protected routes share `AppLayout` (sidebar + header) via React Router's `<Outlet />` pattern.

---

## Component Hierarchy

```
App
├── QueryClientProvider (React Query)
│   └── AuthProvider (AuthContext)
│       └── BrowserRouter
│           ├── /login → LoginPage
│           └── ProtectedRoute
│               └── AppLayout
│                   ├── Sidebar (navigation)
│                   ├── Header (user info + logout)
│                   └── <Outlet /> (page content)
│                       ├── DashboardPage
│                       │   └── Stats cards, storage bar, pool health list
│                       ├── PoolsPage
│                       │   ├── PoolCreateForm (conditional)
│                       │   ├── PoolList
│                       │   └── ConfirmDialog
│                       ├── PoolDetailPage
│                       │   ├── DiskUsageChart
│                       │   └── Vdev config tree
│                       ├── DatasetsPage
│                       │   ├── DatasetCreateForm (conditional)
│                       │   ├── DatasetList
│                       │   ├── SnapshotList (per selected dataset)
│                       │   └── ConfirmDialog
│                       ├── UsersPage
│                       │   ├── UserCreateForm (conditional)
│                       │   ├── UserList
│                       │   └── ConfirmDialog
│                       └── SharesPage
│                           ├── SMBShareForm / NFSExportForm (conditional)
│                           ├── ShareList (tabbed SMB/NFS)
│                           └── ConfirmDialog
```

---

## Key Libraries

| Library | Purpose | Where Used |
|---------|---------|-----------|
| `@tanstack/react-query` | Server state management (caching, refetch, mutations) | All pages |
| `axios` | HTTP client with interceptors | `api/client.ts` |
| `react-router-dom` | Client-side routing | `App.tsx`, all pages |
| `react-hook-form` | Form state management | All create forms |
| `@hookform/resolvers` + `zod` | Schema-based form validation | All create forms |
| `recharts` | Charts (pie chart for disk usage) | `DiskUsageChart.tsx` |
| `@headlessui/react` | Accessible UI primitives (Dialog) | `ConfirmDialog.tsx` |
| `@heroicons/react` | Icon library | Sidebar, Header, page headers |
