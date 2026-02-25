package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"graphly/backend/internal/api"
	"graphly/backend/internal/db"
	ws "graphly/backend/internal/websocket"
)

func main() {
	initCtx, initCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer initCancel()

	pool, err := db.InitDB(initCtx)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}
	defer db.CloseDB()

	userRepo := db.NewUserRepository(pool)
	canvasRepo := db.NewCanvasRepository(pool)
	hub := ws.NewHub()
	go hub.Run()

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(corsConfig))

	api.RegisterRoutes(router, hub, userRepo, canvasRepo)
	router.GET("/ws/:roomId", ws.ServeWS(hub))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	server := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	log.Printf("PixPlot backend listening on %s", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
