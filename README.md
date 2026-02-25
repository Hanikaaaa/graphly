# Graphly (PixPlot)

Graphly is a mind-map/canvas app with:
- Go backend (`Gin`)
- PostgreSQL persistence
- JWT-based authentication
- Static frontend (`HTML/CSS/JS`)

## Current Status

The app currently supports:
- User register/login
- Per-user canvas dashboard
- Canvas create/open/save through REST APIs
- Autosave of canvas JSON to PostgreSQL

The backend also exposes WebSocket room endpoints (`/ws/:roomId`), but the current frontend flow is API-driven and does not actively use that room-based realtime sync path.

## Project Layout

```text
graphly/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/api/
│   ├── internal/auth/
│   ├── internal/db/
│   ├── internal/models/
│   └── internal/websocket/
└── frontend/
    ├── index.html
    ├── main.js
    ├── api-client.js
    ├── auth.js
    ├── canvas-api.js
    └── ...
```

## Prerequisites

- Go `1.24+`
- PostgreSQL `14+` (or compatible)
- Python `3.x`

Check versions:

```powershell
go version
python --version
psql --version
```

## Detailed Local Setup (Windows + PowerShell)

Use two PowerShell terminals:
- Terminal A: backend
- Terminal B: frontend

### Step 1: Confirm PostgreSQL is running

If PostgreSQL is not running, start it from Windows Services or pgAdmin first.

Quick check:

```powershell
psql -h 127.0.0.1 -U postgres -d postgres -c "select version();"
```

If prompted for password, enter your PostgreSQL `postgres` user password.

### Step 2: Create the database (one-time)

```powershell
psql -h 127.0.0.1 -U postgres -d postgres
```

In `psql`:

```sql
CREATE DATABASE graphly;
```

If you see `database "graphly" already exists`, that is fine.

Connect to graphly DB:

```sql
\c graphly
```

### Step 3: Create schema tables (one-time)

Run in `psql`:

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Verify:

```sql
\dt
```

Expected tables:
- `users`
- `canvases`

Exit `psql`:

```sql
\q
```

### Step 4: Start backend (Terminal A)

Go to backend:

```powershell
cd graphly\backend
```

Set environment variables in the same terminal session:

```powershell
$pw = Read-Host "Enter Postgres password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
$enc = [uri]::EscapeDataString($plain)

$env:DATABASE_URL = "postgres://postgres:$enc@127.0.0.1:5432/graphly?sslmode=disable"
$env:JWT_SECRET = "dev-secret-change-me"
$env:PORT = "8080"
```

Install modules and run:

```powershell
go mod tidy
go run cmd/server/main.go
```

Backend should be available at:
- `http://localhost:8080`
- Health check: `http://localhost:8080/health`

### Step 5: Start frontend (Terminal B)

```powershell
cd graphly\frontend
python -m http.server 5500
```

Open in browser:
- `http://localhost:5500`

## Daily Run (After One-Time Setup)

Each time you develop:

1. Start backend in `graphly/backend`
2. Set `DATABASE_URL`, `JWT_SECRET`, and `PORT` in that terminal
3. Run `go run cmd/server/main.go`
4. Start frontend in `graphly/frontend` with `python -m http.server 5500`
5. Open `http://localhost:5500`

## Backend Environment Variables

Required:
- `DATABASE_URL` (PostgreSQL DSN)
- `JWT_SECRET` (token signing secret)

Optional:
- `PORT` (default: `8080`)

Example:

```powershell
$env:DATABASE_URL = "postgres://postgres:<PASSWORD>@127.0.0.1:5432/graphly?sslmode=disable"
$env:JWT_SECRET = "replace-with-a-long-random-secret"
$env:PORT = "8080"
```

## Frontend API Base URL

Frontend default API base URL:
- `http://localhost:8080`

To use a different backend URL, define `window.GRAPHLY_API_BASE_URL` before loading `main.js` in `frontend/index.html`:

```html
<script>
  window.GRAPHLY_API_BASE_URL = "http://192.168.1.15:8080";
</script>
<script type="module" src="./main.js"></script>
```

## API Endpoints

Public:
- `GET /health` -> `{ "status": "ok" }`
- `POST /auth/register`
- `POST /auth/login`
- `GET /rooms`
- `GET /rooms/:id/clients`
- `GET /ws/:roomId` (WebSocket)

Protected (`Authorization: Bearer <token>`):
- `GET /auth/me`
- `POST /canvases`
- `GET /canvases`
- `GET /canvases/:id`
- `PUT /canvases/:id`

## LAN Setup (Multiple Devices, Same Network)

1. Run backend on host:

```powershell
cd graphly\backend
go run cmd/server/main.go
```

2. Run frontend on host (bind all interfaces):

```powershell
cd graphly\frontend
python -m http.server 5500 --bind 0.0.0.0
```

3. Find host IPv4:

```powershell
ipconfig
```

4. Open from another device:
- `http://<HOST_IP>:5500`

5. Validate connectivity from another device:
- `http://<HOST_IP>:5500/index.html`
- `http://<HOST_IP>:8080/health`

## Troubleshooting

### `database init failed` + `password authentication failed for user "postgres"`

Cause:
- Password inside `DATABASE_URL` does not match PostgreSQL password.

Fix:
1. Verify login manually:
   ```powershell
   psql -h 127.0.0.1 -U postgres -d postgres -c "select 1;"
   ```
2. Re-export `DATABASE_URL` using the correct password (URL-encoded).
3. Restart backend in the same terminal.

### `DATABASE_URL is not set`

- Set `DATABASE_URL` in the same terminal where you run `go run`.

### `JWT_SECRET is not set`

- Set `JWT_SECRET` before starting backend.

### Port 8080 already in use

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

### 401 Unauthorized on protected APIs

- Ensure login/register completed and token is stored in browser localStorage.
- Re-login if token expired or secret changed.

### Frontend loads but requests fail

- Confirm backend is running on `http://localhost:8080`.
- Visit `http://localhost:8080/health`.
- Ensure no mixed API base URL override in `index.html`.

## Notes

- Authentication is enabled.
- Canvas data is persisted in PostgreSQL.
- WebSocket backend exists, but current UI persistence path is REST + autosave.
