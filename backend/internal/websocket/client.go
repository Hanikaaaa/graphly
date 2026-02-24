package websocket

import (
    "encoding/json"
    "log"
    "time"

    gws "github.com/gorilla/websocket"

    "graphly/backend/internal/models"
)

const (
    writeWait      = 10 * time.Second
    pongWait       = 60 * time.Second
    pingPeriod     = (pongWait * 9) / 10
    maxMessageSize = 1024 * 64
)

type Client struct {
    hub    *Hub
    conn   *gws.Conn
    send   chan []byte
    roomID string
}

func NewClient(hub *Hub, conn *gws.Conn, roomID string) *Client {
    return &Client{
        hub:    hub,
        conn:   conn,
        send:   make(chan []byte, 256),
        roomID: roomID,
    }
}

func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        _ = c.conn.Close()
    }()

    c.conn.SetReadLimit(maxMessageSize)
    _ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        return c.conn.SetReadDeadline(time.Now().Add(pongWait))
    })

    for {
        _, data, err := c.conn.ReadMessage()
        if err != nil {
            break
        }

        var msg models.Message
        if err := json.Unmarshal(data, &msg); err != nil {
            continue
        }

        if !models.IsValidType(msg.Type) {
            continue
        }

        if msg.RoomID != "" && msg.RoomID != c.roomID {
            continue
        }
        msg.RoomID = c.roomID

        payload, err := json.Marshal(msg)
        if err != nil {
            log.Printf("marshal error: %v", err)
            continue
        }

        c.hub.broadcast <- BroadcastMessage{
            roomID: c.roomID,
            data:   payload,
            sender: c,
        }
    }
}

func (c *Client) writePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        _ = c.conn.Close()
    }()

    for {
        select {
        case message, ok := <-c.send:
            _ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                _ = c.conn.WriteMessage(gws.CloseMessage, []byte{})
                return
            }

            if err := c.conn.WriteMessage(gws.TextMessage, message); err != nil {
                return
            }

        case <-ticker.C:
            _ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(gws.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
