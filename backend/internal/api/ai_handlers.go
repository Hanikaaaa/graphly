package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type AIHandlers struct {
	service *AIService
}

func NewAIHandlers() *AIHandlers {
	return &AIHandlers{
		service: NewAIService(),
	}
}

type generateRequest struct {
	Prompt string `json:"prompt" binding:"required"`
}

func (h *AIHandlers) Generate(c *gin.Context) {
	var req generateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	trimmedPrompt := strings.TrimSpace(req.Prompt)
	if trimmedPrompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "prompt cannot be empty",
		})
		return
	}

	graph, err := h.service.GenerateGraph(trimmedPrompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, graph)
}