package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"graphly/backend/internal/db"
)

const authUserIDContextKey = "userId"

type CanvasHandlers struct {
	repo *db.CanvasRepository
}

type createCanvasRequest struct {
	Title string `json:"title"`
}

type updateCanvasRequest struct {
	Data json.RawMessage `json:"data"`
}

func NewCanvasHandlers(repo *db.CanvasRepository) *CanvasHandlers {
	return &CanvasHandlers{repo: repo}
}

func (h *CanvasHandlers) CreateCanvas(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req createCanvasRequest
	if err := c.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	canvas, err := h.repo.CreateCanvas(c.Request.Context(), userID, req.Title)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to create canvas")
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":        canvas.ID,
		"title":     canvas.Title,
		"ownerId":   canvas.OwnerID,
		"createdAt": canvas.CreatedAt,
		"updatedAt": canvas.UpdatedAt,
	})
}

func (h *CanvasHandlers) ListCanvases(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	canvases, err := h.repo.GetUserCanvases(c.Request.Context(), userID)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to fetch canvases")
		return
	}

	c.JSON(http.StatusOK, canvases)
}

func (h *CanvasHandlers) GetCanvas(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	canvasID := strings.TrimSpace(c.Param("id"))
	if _, err := uuid.Parse(canvasID); err != nil {
		writeError(c, http.StatusBadRequest, "invalid canvas id")
		return
	}

	canvas, err := h.repo.GetCanvasByID(c.Request.Context(), canvasID)
	if err != nil {
		if errors.Is(err, db.ErrCanvasNotFound) {
			writeError(c, http.StatusNotFound, "canvas not found")
			return
		}
		writeError(c, http.StatusInternalServerError, "failed to fetch canvas")
		return
	}

	if canvas.OwnerID != userID {
		writeError(c, http.StatusForbidden, "forbidden")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        canvas.ID,
		"title":     canvas.Title,
		"data":      json.RawMessage(defaultJSON(canvas.Data)),
		"updatedAt": canvas.UpdatedAt,
	})
}

func (h *CanvasHandlers) UpdateCanvas(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	canvasID := strings.TrimSpace(c.Param("id"))
	if _, err := uuid.Parse(canvasID); err != nil {
		writeError(c, http.StatusBadRequest, "invalid canvas id")
		return
	}

	var req updateCanvasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if errors.Is(err, io.EOF) {
			writeError(c, http.StatusBadRequest, "request body is required")
			return
		}
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	normalizedData, err := normalizeCanvasJSON(req.Data)
	if err != nil {
		writeError(c, http.StatusBadRequest, err.Error())
		return
	}

	updatedAt, err := h.repo.UpdateCanvasDataForOwner(c.Request.Context(), canvasID, userID, normalizedData)
	if err != nil {
		switch {
		case errors.Is(err, db.ErrCanvasNotFound):
			writeError(c, http.StatusNotFound, "canvas not found")
		case errors.Is(err, db.ErrCanvasForbidden):
			writeError(c, http.StatusForbidden, "forbidden")
		default:
			writeError(c, http.StatusInternalServerError, "failed to save canvas")
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "saved",
		"updatedAt": updatedAt,
	})
}

func userIDFromContext(c *gin.Context) (string, bool) {
	value, exists := c.Get(authUserIDContextKey)
	if !exists {
		return "", false
	}

	userID, ok := value.(string)
	if !ok {
		return "", false
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return "", false
	}

	if _, err := uuid.Parse(userID); err != nil {
		return "", false
	}

	return userID, true
}

func normalizeCanvasJSON(raw json.RawMessage) (json.RawMessage, error) {
	if len(strings.TrimSpace(string(raw))) == 0 {
		return nil, errors.New("data is required")
	}

	if !json.Valid(raw) {
		return nil, errors.New("data must be valid JSON")
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, errors.New("data must be a JSON object")
	}

	if payload == nil {
		payload = map[string]interface{}{}
	}

	normalized, err := json.Marshal(payload)
	if err != nil {
		return nil, errors.New("failed to process data")
	}

	return normalized, nil
}

func defaultJSON(data json.RawMessage) []byte {
	trimmed := strings.TrimSpace(string(data))
	if trimmed == "" {
		return []byte("{}")
	}
	return []byte(trimmed)
}

func writeError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}
