package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"graphly/backend/internal/auth"
	"graphly/backend/internal/db"
	ws "graphly/backend/internal/websocket"
)

func RegisterRoutes(
	router *gin.Engine,
	hub *ws.Hub,
	userRepo *db.UserRepository,
	canvasRepo *db.CanvasRepository,
) {
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	router.GET("/rooms", func(c *gin.Context) {
		rooms := hub.ListRooms()
		c.JSON(http.StatusOK, gin.H{"rooms": rooms})
	})

	router.GET("/rooms/:id/clients", func(c *gin.Context) {
		id := c.Param("id")
		count := hub.RoomClientCount(id)
		c.JSON(http.StatusOK, gin.H{"roomId": id, "clients": count})
	})

	authMiddleware := auth.AuthMiddleware()
	authHandlers := auth.NewHandlers(userRepo)

	publicAuth := router.Group("/auth")
	publicAuth.POST("/register", authHandlers.Register)
	publicAuth.POST("/login", authHandlers.Login)

	protectedAuth := router.Group("/auth", authMiddleware)
	protectedAuth.GET("/me", authHandlers.Me)

	canvasHandlers := NewCanvasHandlers(canvasRepo, userRepo)
	protectedCanvases := router.Group("/canvases", authMiddleware)
	protectedCanvases.POST("", canvasHandlers.CreateCanvas)
	protectedCanvases.GET("", canvasHandlers.ListCanvases)
	protectedCanvases.GET("/:id", canvasHandlers.GetCanvas)
	protectedCanvases.PUT("/:id", canvasHandlers.UpdateCanvas)
	protectedCanvases.DELETE("/:id", canvasHandlers.DeleteCanvas)
}
