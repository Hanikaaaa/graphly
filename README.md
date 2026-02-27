# Graphly

Graphly is a visual canvas / mind-mapping app with:
- Go backend (`Gin`)
- PostgreSQL persistence
- JWT auth
- Frontend served by backend (landing + app)

## What Is Current

Current codebase behavior:
- `GET /` serves landing page (`frontend/pages/landing.html`)
- `GET /login`, `GET /signup`, `GET /app` serve app shell (`frontend/index.html`)
- Auth APIs are active (`/auth/register`, `/auth/login`, `/auth/me`)
- Canvas APIs are active (`/canvases`)
- Canvas access model supports `private`, `shared`, `public`
- Database model includes `canvas_shares`

## Project Layout

```text
graphly/
├── backend/
│   ├── cmd/server/main.go
│   ├── db/schema.sql
│   └── internal/
│       ├── api/
│       ├── auth/
│       ├── db/
│       ├── models/
│       └── websocket/
└── frontend/
    ├── index.html
    ├── pages/landing.html
    ├── js/landing.js
    ├── main.js
    └── ...
```

## Prerequisites

- Go `1.24+`
- PostgreSQL `14+`
- Optional: Python 3 (only if you want standalone frontend serving)

Check:

```powershell
go version
psql --version
python --version
```

## Recommended Run Flow (Current Project)

Run backend and use backend-served frontend routes.

### 1) Create database and schema (one-time)

Open psql:

```powershell
psql -h 127.0.0.1 -U postgres -d postgres
```

Create DB if needed:

```sql
CREATE DATABASE graphly;
```

Connect:

```sql
\c graphly
```

Create/update schema:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canvases (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Canvas',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  access_type TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canvas_shares (
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (canvas_id, user_id)
);
```

Verify:

```sql
\dt
```

Exit:

```sql
\q
```

### 2) Start backend

From `graphly/backend`:

```powershell
cd C:\Users\amoll\OneDrive\Desktop\Graphly_WE\graphly\backend
```

Set env vars in the same terminal:

```powershell
$pw = Read-Host "Enter Postgres password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
$enc = [uri]::EscapeDataString($plain)

$env:DATABASE_URL = "postgres://postgres:$enc@127.0.0.1:5432/graphly?sslmode=disable"
$env:JWT_SECRET = "change-this-to-a-long-random-secret"
$env:PORT = "8080"
```

Run:

```powershell
go mod tidy
go run cmd/server/main.go
```

### 3) Open app

- Landing page: `http://localhost:8080/`
- App route: `http://localhost:8080/app`
- Health check: `http://localhost:8080/health`

## Optional: Frontend Standalone Mode

Use this only if you explicitly want a separate static server for frontend files.

```powershell
cd C:\Users\amoll\OneDrive\Desktop\Graphly_WE\graphly\frontend
python -m http.server 5500
```

Open:
- `http://localhost:5500/index.html`

Notes:
- Backend must still run on `http://localhost:8080`.
- Standalone mode does not provide backend-managed routes like `/`, `/login`, `/signup`, `/app`.

## Environment Variables

Required:
- `DATABASE_URL`
- `JWT_SECRET`

Optional:
- `PORT` (default `8080`)

## API Endpoints

Public:
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /rooms`
- `GET /rooms/:id/clients`
- `GET /ws/:roomId`

Protected (`Authorization: Bearer <token>`):
- `GET /auth/me`
- `POST /canvases`
- `GET /canvases`
- `GET /canvases/:id`
- `PUT /canvases/:id`

## Troubleshooting

### Password auth failed for postgres

Error example:
- `password authentication failed for user "postgres"`

Fix:
1. Verify credentials:
   ```powershell
   psql -h 127.0.0.1 -U postgres -d postgres -c "select 1;"
   ```
2. Re-export `DATABASE_URL` with correct password in same backend terminal.
3. Restart `go run cmd/server/main.go`.

### Canvas create fails / Missing DB columns after old setup

If you see `failed to create canvas` (or errors referencing `access_type` / `canvas_shares`), your local schema is likely behind the current backend model.

Run:

```sql
ALTER TABLE canvases
ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'private',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS canvas_shares (
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (canvas_id, user_id)
);
```

Verify table shape:

```sql
\d+ canvases
```

### `DATABASE_URL is not set`

- Set `DATABASE_URL` in the same shell session before running backend.

### `JWT_SECRET is not set`

- Set `JWT_SECRET` before starting backend.

### Port already in use

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

## Notes

- Data persistence is PostgreSQL-backed.
- Autosave path is REST (`PUT /canvases/:id`).
- WebSocket endpoints exist for collaboration messaging.
