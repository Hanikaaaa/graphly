# Graphly (PixPlot)

Collaborative canvas app with:
- Go backend (`Gin` + `Gorilla WebSocket`)
- Static frontend (`HTML/CSS/JS`)
- Room-based real-time sync

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
    ├── collaboration.js
    └── ...
```

## Prerequisites

- Go (latest stable recommended)
- Python 3 (for static frontend hosting)

Check:

```powershell
go version
python --version
```

## Run Locally (Same Machine)

### 1) Backend

From `graphly/backend`:

```powershell
go mod tidy
go run cmd/server/main.go
```

Default backend address: `http://localhost:8080`

Optional port override:

```powershell
$env:PORT="9090"
go run cmd/server/main.go
```

### 2) Frontend

From `graphly/frontend`:

```powershell
python -m http.server 5500
```

Open:
- `http://localhost:5500/?room=demo`

## Room Usage

Room ID is read from URL:
- Query param: `?room=team-alpha`
- Hash: `#team-alpha`
- Fallback: `default-room`

Examples:
- `http://localhost:5500/?room=team-alpha`
- `http://localhost:5500/#team-alpha`

Do **not** use path-based rooms on the static server (this causes 404):
- `http://localhost:5500/team-alpha`  <- wrong

## Collaboration Behavior

- Room is auto-created on first WebSocket join.
- Room is removed when last client disconnects.
- State is in-memory only (no database).
- If canvas is empty, click/double-click canvas to create first node.

## API Endpoints

- `GET /health` -> `{ "status": "ok" }`
- `GET /rooms` -> active room list
- `GET /rooms/:id/clients` -> client count in room
- `GET /ws/:roomId` -> WebSocket endpoint

## WebSocket Message Format

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

## LAN Setup (Multiple Devices, Same Network)

### 1) Start backend and frontend on host machine

Backend:

```powershell
cd graphly\backend
go run cmd/server/main.go
```

Frontend (bind all interfaces):

```powershell
cd graphly\frontend
python -m http.server 5500 --bind 0.0.0.0
```

### 2) Find host LAN IP

```powershell
ipconfig
```

Use IPv4 like `192.168.x.x`.

### 3) Open firewall ports (host machine, Admin PowerShell)

```powershell
New-NetFirewallRule -DisplayName "Graphly Frontend 5500" -Direction Inbound -Protocol TCP -LocalPort 5500 -Action Allow
New-NetFirewallRule -DisplayName "Graphly Backend 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

### 4) Open app from other devices

- `http://<HOST_IP>:5500/?room=team-alpha`

### 5) Validate connectivity from another device

- `http://<HOST_IP>:5500/index.html`
- `http://<HOST_IP>:8080/health`

If these fail, network/firewall is blocking access.

## Different Networks (Internet Access)

Local IPs (`192.168.x.x`, `172.x.x.x`) do not work across different networks.

Use one of:
- Tunnel (quick testing): `ngrok` / `cloudflared`
- Deploy backend + frontend publicly with HTTPS/WSS (recommended)

## Quick Troubleshooting

### Port 8080 already in use

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

### Blank canvas

- Use a new room URL (`?room=new-name`)
- Hard refresh (`Ctrl+Shift+R`)
- Click canvas to create first node

### Second device timeout

- Ensure both devices are on same network
- Use reachable host LAN IP (`192.168.x.x` usually)
- Confirm firewall rules for ports `5500` and `8080`

## Notes

- No auth/authorization is enabled yet.
- Anyone with room URL can join that room.
- Restarting backend clears all active rooms and state.
