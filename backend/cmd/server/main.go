package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"graphly/backend/internal/api"
	"graphly/backend/internal/db"
	ws "graphly/backend/internal/websocket"
)

func resolveFrontendDir() string {
	candidates := []string{
		filepath.Clean(filepath.Join("..", "frontend")),
		filepath.Clean(filepath.Join("graphly", "frontend")),
		filepath.Clean("frontend"),
	}

	for _, candidate := range candidates {
		indexPath := filepath.Join(candidate, "index.html")
		if info, err := os.Stat(indexPath); err == nil && !info.IsDir() {
			return candidate
		}
	}

	return filepath.Clean(filepath.Join("..", "frontend"))
}

func serveFrontendPage(frontendDir, relativePath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.File(filepath.Join(frontendDir, relativePath))
	}
}

func serveFrontendAsset(frontendDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		fileName := c.Param("file")
		if fileName == "" || strings.Contains(fileName, "/") || strings.Contains(fileName, "\\") {
			c.Status(http.StatusNotFound)
			return
		}

		switch strings.ToLower(filepath.Ext(fileName)) {
		case ".css", ".js", ".map", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico":
		default:
			c.Status(http.StatusNotFound)
			return
		}

		filePath := filepath.Join(frontendDir, fileName)
		if _, err := os.Stat(filePath); err != nil {
			c.Status(http.StatusNotFound)
			return
		}

		c.File(filePath)
	}
}

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

	frontendDir := resolveFrontendDir()
	router.GET("/", serveFrontendPage(frontendDir, filepath.Join("pages", "landing.html")))

	serveApp := serveFrontendPage(frontendDir, "index.html")
	router.GET("/login", serveApp)
	router.GET("/signup", serveApp)
	router.GET("/app", serveApp)
	router.Static("/assets", filepath.Join(frontendDir, "assets"))

	router.Static("/js", filepath.Join(frontendDir, "js"))
	router.Static("/css", filepath.Join(frontendDir, "css"))

	router.GET("/:file", serveFrontendAsset(frontendDir))

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
