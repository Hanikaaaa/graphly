package websocket

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	gws "github.com/gorilla/websocket"
)

var upgrader = gws.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin != ""
	},
}

func ServeWS(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		roomID := c.Param("roomId")
		if roomID == "" {
			roomID = c.Query("roomId")
		}
		if roomID == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "roomId is required"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("websocket upgrade failed room=%s err=%v", roomID, err)
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "websocket upgrade failed"})
			return
		}

		log.Printf("websocket connect room=%s remote=%s", roomID, c.ClientIP())
		client := NewClient(hub, conn, roomID)
		hub.register <- client

		go client.writePump()
		go client.readPump()
	}
}
