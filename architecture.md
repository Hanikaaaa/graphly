# Graphly Architecture

## Overview

Graphly follows a backend-served frontend architecture:
- Go backend exposes REST APIs, auth, and WebSocket endpoints
- Backend also serves frontend HTML, CSS, JS, and assets
- Frontend is a modular ES-module app with canvas state + UI modules
- PostgreSQL stores users, canvases, and sharing relationships

## High-Level Diagram

```text
Browser
  |  HTTP(S)
  v
Gin Server (backend/cmd/server/main.go)
  |- Static frontend routes: /, /app, /login, /signup, /css, /js, /assets
  |- REST APIs: /auth, /canvases, /ai
  |- WebSocket: /ws/:roomId
  v
PostgreSQL (users, canvases, canvas_shares)
```

## Backend Architecture

### Entry Point

- `backend/cmd/server/main.go`
- Responsibilities:
- initialize DB pool
- create repositories
- register API routes
- start WebSocket hub
- configure CORS and static serving

### Layers

- `internal/api`
- HTTP handlers and route registration
- validates inputs and maps request/response payloads
- `internal/auth`
- JWT generation/validation
- auth middleware for protected routes
- `internal/db`
- data access/repository layer (pgx)
- canvas access checks and persistence
- `internal/models`
- core data models
- `internal/websocket`
- room hub, client registration, broadcast handling

### API Surface

- Auth: register/login/me
- Canvases: CRUD with ownership/share-aware access
- AI: prompt-to-graph generation endpoint
- Collaboration/Rooms: room listing, client counts, WebSocket room endpoint

## Frontend Architecture

### Entry and Routing

- Landing: `frontend/pages/landing.html`
- App shell: `frontend/index.html`
- Main entry: `frontend/main.js`

### Frontend Modules (examples)

- State and rendering:
- `state.js`, `renderer.js`, `elements.js`, `layout-engine.js`
- Interaction system:
- `interaction/drag.js`, `interaction/resize.js`, `interaction/connect.js`, `interaction/pan.js`, `interaction/marquee.js`
- UI panels and controls:
- `ui-panel.js`, `panel-interaction.js`, `dashboard-ui.js`, `auth-ui.js`
- Collaboration and persistence:
- `collaboration.js`, `canvas-api.js`, `api-client.js`
- AI integration:
- `ai-ui.js`, `ai-transformer.js`, `ai-style-mapper.js`
- Export:
- `export-region.js`, `selection-export.js`

## Data Model

Primary tables:
- `users`
- `canvases`
- `canvas_shares`

Key relationships:
- `canvases.owner_id -> users.id`
- `canvas_shares.canvas_id -> canvases.id`
- `canvas_shares.user_id -> users.id`

Access modes:
- `private`: owner + explicitly shared users
- `shared`: owner + shared users
- `public`: readable broadly, with edit checks enforced by backend

## Request Flows

### Auth flow

1. Client calls `POST /auth/register` or `POST /auth/login`
2. Backend returns JWT
3. Client stores token and sends `Authorization: Bearer <token>` for protected APIs

### Canvas save flow

1. Client edits canvas state
2. Client sends `PUT /canvases/:id` with serialized JSON data
3. Backend verifies permissions
4. Repository persists JSONB and returns updated timestamp

### Collaboration flow

1. Client opens `GET /ws/:roomId` WebSocket
2. Hub registers client in room
3. Messages are broadcast to room participants

## Static Asset and CSS Pipeline

- Backend serves static directories:
- `/css` -> `frontend/css`
- `/js` -> `frontend/js`
- `/assets` -> `frontend/assets`
- Tailwind is built in `frontend` with CLI:
- input: `css/tailwind.input.css`
- output: `css/tailwind.css`
- HTML links `/css/tailwind.css`

## Deployment Notes

- Keep Go backend and frontend artifacts together (backend serves frontend)
- Build Tailwind CSS before deployment:
- `npm run tailwind:build` in `frontend`
- Ensure environment variables are set in deployment runtime:
- `DATABASE_URL`, `JWT_SECRET`, optional `PORT`, AI key if needed
- Run schema provisioning/migrations before app start

## Known Gaps / Future Improvements

- Add structured migrations tool (instead of manual schema application)
- Add tests for API handlers and repository permissions
- Add observability (request tracing, metrics)
- Harden CORS policy for production domains
- Add CI pipeline for lint/test/build
