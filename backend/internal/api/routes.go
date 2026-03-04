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

	api := router.Group("/api")

	api.GET("/rooms", func(c *gin.Context) {
		rooms := hub.ListRooms()
		c.JSON(http.StatusOK, gin.H{"rooms": rooms})
	})

	api.GET("/rooms/:id/clients", func(c *gin.Context) {
		id := c.Param("id")
		count := hub.RoomClientCount(id)
		c.JSON(http.StatusOK, gin.H{"roomId": id, "clients": count})
	})

	authMiddleware := auth.AuthMiddleware()
	authHandlers := auth.NewHandlers(userRepo)

	publicAuth := api.Group("/auth")
	publicAuth.POST("/register", authHandlers.Register)
	publicAuth.POST("/login", authHandlers.Login)

	protectedAuth := api.Group("/auth", authMiddleware)
	protectedAuth.GET("/me", authHandlers.Me)

	canvasHandlers := NewCanvasHandlers(canvasRepo, userRepo)
	protectedCanvases := api.Group("/canvases", authMiddleware)
	protectedCanvases.POST("", canvasHandlers.CreateCanvas)
	protectedCanvases.GET("", canvasHandlers.ListCanvases)
	protectedCanvases.GET("/:id", canvasHandlers.GetCanvas)
	protectedCanvases.PUT("/:id", canvasHandlers.UpdateCanvas)
	protectedCanvases.DELETE("/:id", canvasHandlers.DeleteCanvas)

	aiHandlers := NewAIHandlers()
	protectedAI := api.Group("/ai", authMiddleware)
	protectedAI.POST("/generate", aiHandlers.Generate)
}
