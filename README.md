# Graphly (PixPlot)

Collaborative canvas app with:
- Go backend (`Gin` + `Gorilla WebSocket`)
- Static frontend (`HTML/CSS/JS`)

## Project Layout

```text
graphly/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/api/routes.go
│   ├── internal/models/message.go
│   └── internal/websocket/
└── frontend/
    ├── index.html
    ├── main.js
    └── ...
```

## Prerequisites

- Go installed (latest stable recommended)
- Python 3 (for quick static frontend hosting)

Check versions:

```powershell
go version
python --version
```

## Run the Backend

From `graphly/backend`:

```powershell
go mod tidy
go run cmd/server/main.go
```

Server defaults to `http://localhost:8080`.

Optional port override:

```powershell
$env:PORT="9090"
go run cmd/server/main.go
```

## Run the Frontend

From `graphly/frontend`:

```powershell
python -m http.server 5500
```

Open:
- `http://localhost:5500`

Frontend WebSocket target:
- `ws://localhost:8080/ws/{roomId}`

## API Endpoints

- `GET /health` -> `{ "status": "ok" }`
- `GET /rooms` -> list active rooms
- `GET /rooms/:id/clients` -> client count for a room
- `GET /ws/:roomId` -> WebSocket endpoint

## WebSocket Message Contract

All messages are JSON with this shape:

```json
{
  "type": "node_update",
  "roomId": "string",
  "userId": "string",
  "payload": {}
}
```

Supported `type` values:
- `node_create`
- `node_update`
- `node_delete`
- `cursor_move`

## Quick Verification

In a new terminal while backend is running:

```powershell
curl http://localhost:8080/health
curl http://localhost:8080/rooms
curl http://localhost:8080/rooms/test/clients
```

Expected:
- health returns `{"status":"ok"}`
- rooms returns JSON with `rooms`

## Notes

- Rooms are created when the first user joins and removed when empty.
- No database is used yet; state is in-memory.
- Restarting backend clears room/client state.
