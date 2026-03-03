# Graphly

Graphly is a collaborative visual canvas and mind-mapping platform built with a Go backend and a modular HTML/JavaScript frontend.

## Description

Graphly helps teams and individuals:
- map ideas visually on an infinite canvas
- collaborate in near real-time
- organize nodes and connectors with flexible styling
- save and manage canvases with access control
- generate graph structures from prompts using AI

## Core Features

- Canvas editing
- Draggable nodes, connectors, grouping, resizing, panning, and zooming
- Grid/dot/none background options
- Node styling controls (color, typography, shape, border, opacity)
- Export options
- PNG and PDF export for selected regions
- Authentication
- User registration, login, JWT-based session flow
- Canvas management
- Create, list, get, update, delete canvases
- Access model: `private`, `shared`, `public`
- Collaboration foundation
- WebSocket room support and room client visibility
- AI-assisted graph generation
- Prompt-based graph generation endpoint and frontend integration
- Landing page + app shell routing
- `/` serves landing page
- `/login`, `/signup`, `/app` serve app shell
- Production-ready Tailwind CSS setup
- Tailwind CLI build pipeline with purge/content scanning and minified output

## Tech Stack

- Backend: Go 1.24, Gin, pgx, Gorilla WebSocket, JWT
- Database: PostgreSQL
- Frontend: HTML, CSS, JavaScript (ES modules)
- Styling: Tailwind CSS 

## Repository Structure

```text
graphly/
├── backend/
│   ├── cmd/server/main.go
│   ├── db/schema.sql
│   ├── go.mod
│   └── internal/
│       ├── api/
│       ├── auth/
│       ├── db/
│       ├── models/
│       └── websocket/
├── frontend/
│   ├── assets/
│   ├── css/
│   │   ├── tailwind.input.css
│   │   └── tailwind.css
│   ├── geometry/
│   ├── interaction/
│   ├── js/
│   ├── pages/
│   │   └── landing.html
│   ├── index.html
│   ├── main.js
│   ├── package.json
│   └── tailwind.config.js
├── architecture.md
└── README.md
```

## Prerequisites

- Go 1.24+
- Node.js 18+ and npm
- PostgreSQL 14+

Quick checks:

```powershell
go version
node -v
npm -v
psql --version
```

## Environment Variables

Set these in the same shell where backend runs:

- `DATABASE_URL` (required)
- `JWT_SECRET` (required)
- `GOOGLE_API_KEY` (required for AI endpoint)
- `PORT` (optional, defaults to `8080`)

Example PowerShell setup:

```powershell
$pw = Read-Host "Enter Postgres password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
$enc = [uri]::EscapeDataString($plain)

$env:DATABASE_URL = "postgres://postgres:$enc@127.0.0.1:5432/graphly?sslmode=disable"
$env:JWT_SECRET = "change-this-to-a-long-random-secret"
$env:GOOGLE_API_KEY = "your-google-api-key"
$env:PORT = "8080"
```

## Setup and Run (Windows PowerShell)

### 1) Database setup (one time)

```powershell
psql -h 127.0.0.1 -U postgres -d postgres
```

Inside `psql`:

```sql
CREATE DATABASE graphly;
\c graphly
\i backend/db/schema.sql
\q
```

If `\i` path fails, use full absolute path to `schema.sql`.

### 2) Install frontend dependencies

```powershell
cd \graphly\frontend
npm install
```

### 3) Build Tailwind CSS (production)

```powershell
npm run tailwind:build
```

For development watch mode (in a separate terminal):

```powershell
npm run tailwind:watch
```

### 4) Run backend server

```powershell
cd \graphly\backend
go mod tidy
go run cmd/server/main.go
```

### 5) Open the app

- Landing page: `http://localhost:8080/`
- App shell: `http://localhost:8080/app`
- Health check: `http://localhost:8080/health`

## Tailwind Commands

Run from `frontend/`:

```powershell
npm run tailwind:watch
npm run tailwind:build
```

`tailwind.config.js` is configured to scan:
- frontend HTML files
- frontend JS files
- backend template-like files (`.tmpl`, `.gohtml`, `.html`)

This keeps production CSS small by removing unused classes.

## API Overview

### Public

- `GET /health`
- `GET /rooms`
- `GET /rooms/:id/clients`
- `POST /auth/register`
- `POST /auth/login`
- `GET /ws/:roomId`

### Protected (Bearer token)

- `GET /auth/me`
- `POST /canvases`
- `GET /canvases`
- `GET /canvases/:id`
- `PUT /canvases/:id`
- `DELETE /canvases/:id`
- `POST /ai/generate`

## Team Members

- Amolly Choudhary
- Ananya Kuchhal
- Hanika Reddy

## Troubleshooting

### `DATABASE_URL is not set`

Set `DATABASE_URL` in the same terminal before starting backend.

### `JWT_SECRET is not set`

Set `JWT_SECRET` in the same terminal before starting backend.

### PostgreSQL password/auth errors

```powershell
psql -h 127.0.0.1 -U postgres -d postgres -c "select 1;"
```

Then re-export `DATABASE_URL` with correct credentials.

### Port already in use

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

### Tailwind output not updating

From `frontend/`:

```powershell
npm run tailwind:watch
```

Confirm HTML links to `/css/tailwind.css` and no Tailwind CDN script remains.

## Documentation

- High-level architecture: [architecture.md](architecture.md)

## License

No license file is currently included in this repository.
