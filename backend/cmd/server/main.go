package main

import (
    "log"
    "net/http"
    "os"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"

    "graphly/backend/internal/api"
    ws "graphly/backend/internal/websocket"
)

func main() {
    hub := ws.NewHub()
    go hub.Run()

    router := gin.New()
    router.Use(gin.Logger(), gin.Recovery())

    corsConfig := cors.DefaultConfig()
    corsConfig.AllowAllOrigins = true
    corsConfig.AllowMethods = []string{"GET", "POST", "OPTIONS"}
    corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
    router.Use(cors.New(corsConfig))

    api.RegisterRoutes(router, hub)
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
