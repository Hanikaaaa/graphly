package websocket

import (
    "net/http"

    "github.com/gin-gonic/gin"
    gws "github.com/gorilla/websocket"
)

var upgrader = gws.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

func ServeWS(hub *Hub) gin.HandlerFunc {
    return func(c *gin.Context) {
        roomID := c.Param("roomId")
        if roomID == "" {
            c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "roomId is required"})
            return
        }

        conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
        if err != nil {
            return
        }

        client := NewClient(hub, conn, roomID)
        hub.register <- client

        go client.writePump()
        go client.readPump()
    }
}
