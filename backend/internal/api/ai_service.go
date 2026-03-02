package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
)

type AIService struct {
	apiKey string
	client *http.Client
}

func NewAIService() *AIService {
	return &AIService{
		apiKey: os.Getenv("GOOGLE_API_KEY"),
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Minimal schema returned by AI
type aiGraph struct {
	Nodes []struct {
		Key  string `json:"key"`
		Text string `json:"text"`
		Role string `json:"role"`
	} `json:"nodes"`
	Connections []struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"connections"`
}

type GeneratedGraph struct {
	Nodes       []map[string]interface{} `json:"nodes"`
	Connections []map[string]interface{} `json:"connections"`
}

func (s *AIService) GenerateGraph(prompt string) (*GeneratedGraph, error) {
	if strings.TrimSpace(prompt) == "" {
		return nil, errors.New("prompt cannot be empty")
	}

	if s.apiKey == "" {
		return nil, errors.New("GOOGLE_API_KEY not set")
	}

systemPrompt := `
You generate structured graph JSON only.
Return ONLY valid JSON.
Do NOT wrap in markdown.

Format:
{
  "nodes": [
    { "key": "n1", "text": "Node text", "role": "core|category|detail" }
  ],
  "connections": [
    { "from": "n1", "to": "n2" }
  ]
}

Rules:
- Exactly one node must have role "core"
- Other nodes must use ONLY these roles:
  "theme", "concept", "process", "decision",
  "example", "fact", "warning", "question"
- Themes connect from core
- Concepts connect from themes
- Examples and facts connect from concepts
- Processes may connect from themes or concepts
- Decisions must connect from process nodes
- Aim for 4 - 6 main themes
- Each theme should have 2 - 4 children
- Maximum 35 nodes
- Keep the structure balanced 
- No explanations
`

	fullPrompt := systemPrompt + "\nUser Input:\n" + prompt

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	url := "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + s.apiKey	
	requestBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{"text": fullPrompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Check HTTP status
	if resp.StatusCode != http.StatusOK {
		var errBody map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errBody)
		return nil, fmt.Errorf("gemini API error: %v", errBody)
	}

	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	// Safe extraction
	candidates, ok := raw["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		return nil, errors.New("no candidates returned from Gemini")
	}

	candidateMap, ok := candidates[0].(map[string]interface{})
	if !ok {
		return nil, errors.New("invalid candidate structure")
	}

	contentMap, ok := candidateMap["content"].(map[string]interface{})
	if !ok {
		return nil, errors.New("invalid content structure")
	}

	parts, ok := contentMap["parts"].([]interface{})
	if !ok || len(parts) == 0 {
		return nil, errors.New("no content parts returned")
	}

	partMap, ok := parts[0].(map[string]interface{})
	if !ok {
		return nil, errors.New("invalid part structure")
	}

	text, ok := partMap["text"].(string)
	if !ok {
		return nil, errors.New("no text in Gemini response")
	}

	cleaned := cleanJSON(text)

	var parsed aiGraph
	if err := json.Unmarshal([]byte(cleaned), &parsed); err != nil {
		return nil, errors.New("invalid AI JSON response")
	}

	return mapToGraphlyModel(parsed), nil
}

// Removes ```json wrappers if Gemini adds them
func cleanJSON(input string) string {
	input = strings.TrimSpace(input)

	if strings.HasPrefix(input, "```") {
		input = strings.TrimPrefix(input, "```json")
		input = strings.TrimPrefix(input, "```")
		input = strings.TrimSuffix(input, "```")
	}

	return strings.TrimSpace(input)
}

func mapToGraphlyModel(input aiGraph) *GeneratedGraph {
	keyToID := make(map[string]string)

	nodes := []map[string]interface{}{}
	connections := []map[string]interface{}{}

	for _, n := range input.Nodes {
		id := uuid.New().String()
		keyToID[n.Key] = id

		node := map[string]interface{}{
			"id":   id,
			"text": n.Text,
			"role": n.Role,
		}
		role := strings.ToLower(strings.TrimSpace(n.Role))

		validRoles := map[string]bool{
			"core": true,
			"theme": true,
			"concept": true,
			"process": true,
			"decision": true,
			"example": true,
			"fact": true,
			"warning": true,
			"question": true,
		}

		if !validRoles[role] {
			role = "concept"
		}

		node["role"] = role

		nodes = append(nodes, node)
	}

	for _, c := range input.Connections {
		fromID := keyToID[c.From]
		toID := keyToID[c.To]

		if fromID == "" || toID == "" {
			continue
		}

		conn := map[string]interface{}{
			"id":   uuid.New().String(),
			"from": fromID,
			"to":   toID,
		}

		connections = append(connections, conn)
	}

	return &GeneratedGraph{
		Nodes:       nodes,
		Connections: connections,
	}
}
