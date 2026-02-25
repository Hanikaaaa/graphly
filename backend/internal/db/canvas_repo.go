package db

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"graphly/backend/internal/models"
)

const defaultDBTimeout = 5 * time.Second

var (
	ErrCanvasNotFound  = errors.New("canvas not found")
	ErrCanvasForbidden = errors.New("canvas access forbidden")
)

type CanvasRepository struct {
	pool *pgxpool.Pool
}

func NewCanvasRepository(pool *pgxpool.Pool) *CanvasRepository {
	return &CanvasRepository{pool: pool}
}

func (r *CanvasRepository) CreateCanvas(ctx context.Context, ownerID, title string) (*models.Canvas, error) {
	queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
	defer cancel()

	canvas := &models.Canvas{
		ID:      uuid.NewString(),
		OwnerID: ownerID,
		Title:   normalizeCanvasTitle(title),
		Data:    json.RawMessage("{}"),
	}

	query := `
		INSERT INTO canvases (id, owner_id, title, data)
		VALUES ($1, $2, $3, $4::jsonb)
		RETURNING created_at, updated_at
	`

	err := r.pool.QueryRow(queryCtx, query, canvas.ID, canvas.OwnerID, canvas.Title, canvas.Data).Scan(
		&canvas.CreatedAt,
		&canvas.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return canvas, nil
}

func (r *CanvasRepository) GetUserCanvases(ctx context.Context, userID string) ([]models.CanvasListItem, error) {
	queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
	defer cancel()

	query := `
		SELECT id, title, updated_at
		FROM canvases
		WHERE owner_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := r.pool.Query(queryCtx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.CanvasListItem, 0)
	for rows.Next() {
		var item models.CanvasListItem
		if scanErr := rows.Scan(&item.ID, &item.Title, &item.UpdatedAt); scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

func (r *CanvasRepository) GetCanvasByID(ctx context.Context, canvasID string) (*models.Canvas, error) {
	queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
	defer cancel()

	query := `
		SELECT id, owner_id, title, data, created_at, updated_at
		FROM canvases
		WHERE id = $1
		LIMIT 1
	`

	canvas := &models.Canvas{}
	err := r.pool.QueryRow(queryCtx, query, canvasID).Scan(
		&canvas.ID,
		&canvas.OwnerID,
		&canvas.Title,
		&canvas.Data,
		&canvas.CreatedAt,
		&canvas.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCanvasNotFound
		}
		return nil, err
	}

	if len(canvas.Data) == 0 {
		canvas.Data = json.RawMessage("{}")
	}

	return canvas, nil
}

func (r *CanvasRepository) UpdateCanvasData(ctx context.Context, canvasID string, jsonData json.RawMessage) (time.Time, error) {
	queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
	defer cancel()

	query := `
		UPDATE canvases
		SET data = $2::jsonb, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	var updatedAt time.Time
	err := r.pool.QueryRow(queryCtx, query, canvasID, jsonData).Scan(&updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return time.Time{}, ErrCanvasNotFound
		}
		return time.Time{}, err
	}

	return updatedAt, nil
}

func (r *CanvasRepository) UpdateCanvasDataForOwner(ctx context.Context, canvasID, ownerID string, jsonData json.RawMessage) (time.Time, error) {
	queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
	defer cancel()

	query := `
		UPDATE canvases
		SET data = $3::jsonb, updated_at = NOW()
		WHERE id = $1 AND owner_id = $2
		RETURNING updated_at
	`

	var updatedAt time.Time
	err := r.pool.QueryRow(queryCtx, query, canvasID, ownerID, jsonData).Scan(&updatedAt)
	if err == nil {
		return updatedAt, nil
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return time.Time{}, err
	}

	exists, existsErr := r.canvasExists(ctx, canvasID)
	if existsErr != nil {
		return time.Time{}, existsErr
	}
	if !exists {
		return time.Time{}, ErrCanvasNotFound
	}

	return time.Time{}, ErrCanvasForbidden
}

func (r *CanvasRepository) canvasExists(ctx context.Context, canvasID string) (bool, error) {
	queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
	defer cancel()

	query := `SELECT 1 FROM canvases WHERE id = $1 LIMIT 1`
	var marker int
	err := r.pool.QueryRow(queryCtx, query, canvasID).Scan(&marker)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func normalizeCanvasTitle(title string) string {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return "Untitled Canvas"
	}
	return trimmed
}
