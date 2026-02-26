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
	"github.com/jackc/pgx/v5/pgtype"
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

func (r *CanvasRepository) CreateCanvas(ctx context.Context, ownerID, title string, accessType string) (*models.Canvas, error) {
	queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
	defer cancel()

	canvas := &models.Canvas{
		ID:      uuid.NewString(),
		OwnerID: ownerID,
		Title:   normalizeCanvasTitle(title),
		Data:    json.RawMessage("{}"),
		AccessType: accessType,
		SharedWith: []string{},
	}

	query := `
		INSERT INTO canvases (id, owner_id, title, data, access_type)
		VALUES ($1, $2, $3, $4::jsonb, $5)
		RETURNING created_at, updated_at
	`

	err := r.pool.QueryRow(queryCtx, query, canvas.ID, canvas.OwnerID, canvas.Title, canvas.Data, canvas.AccessType).Scan(
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
        SELECT c.id, c.title, c.updated_at, c.access_type, u.email
        FROM canvases c
        JOIN users u ON u.id = c.owner_id
        WHERE c.owner_id = $1

        UNION

        SELECT c.id, c.title, c.updated_at, c.access_type, u.email
        FROM canvases c
        JOIN users u ON u.id = c.owner_id
        JOIN canvas_shares cs ON cs.canvas_id = c.id
        WHERE cs.user_id = $1

		UNION

		SELECT c.id, c.title, c.updated_at, c.access_type, u.email
		FROM canvases c
        JOIN users u ON u.id = c.owner_id
		WHERE c.access_type = 'public'

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
		if scanErr := rows.Scan(
			&item.ID,
			&item.Title,
			&item.UpdatedAt,
			&item.AccessType,
			&item.OwnerEmail,
		); scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}
func (r *CanvasRepository) GetCanvasByID(ctx context.Context, canvasID string, userID string) (*models.Canvas, error) {
	queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
	defer cancel()

	query := `
		SELECT id, owner_id, title, data, access_type, created_at, updated_at
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
		&canvas.AccessType,
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

	if userID != canvas.OwnerID{
		if canvas.AccessType == "private"{
			shared, shareErr := r.isCanvasSharedWith(ctx, canvasID, userID)
			if shareErr != nil {
                return nil, shareErr
            }
            if !shared {
                return nil, ErrCanvasForbidden
            }
		}
	}
	sharedUsers, err := r.getSharedUsers(ctx, canvasID)
	if err == nil {
        canvas.SharedWith = sharedUsers
    }


	return canvas, nil
}

func (r *CanvasRepository) UpdateCanvasData(ctx context.Context, canvasID string, userID string, jsonData json.RawMessage) (time.Time, error) {

    canEdit, err := r.canUserEditCanvas(ctx, canvasID, userID)
    if err != nil {
        return time.Time{}, err
    }
    if !canEdit {
        return time.Time{}, ErrCanvasForbidden
    }

    queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
    defer cancel()

    query := `
        UPDATE canvases
        SET data = $2::jsonb, updated_at = NOW()
        WHERE id = $1
        RETURNING updated_at
    `

    var updatedAt time.Time
    err = r.pool.QueryRow(queryCtx, query, canvasID, jsonData).Scan(&updatedAt)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return time.Time{}, ErrCanvasNotFound
        }
        return time.Time{}, err
    }

    return updatedAt, nil
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
func (r *CanvasRepository) isCanvasSharedWith(ctx context.Context, canvasID, userID string) (bool, error) {
    queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
    defer cancel()

    var exists bool
    err := r.pool.QueryRow(queryCtx, `
        SELECT EXISTS (
            SELECT 1 FROM canvas_shares
            WHERE canvas_id = $1 AND user_id = $2::uuid
        )
    `, canvasID, userID).Scan(&exists)
    if err != nil {
        return false, err
    }
    return exists, nil
}
func (r *CanvasRepository) getSharedUsers(ctx context.Context, canvasID string) ([]string, error) {
    queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
    defer cancel()

    rows, err := r.pool.Query(queryCtx, `
        SELECT user_id FROM canvas_shares
        WHERE canvas_id = $1
    `, canvasID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    users := make([]string, 0)
    for rows.Next() {
        var u pgtype.UUID
        if err := rows.Scan(&u); err != nil {
            return nil, err
        }
        users = append(users, u.String())
    }

    if err := rows.Err(); err != nil {
        return nil, err
    }

    return users, nil
}
func (r *CanvasRepository) canUserEditCanvas(ctx context.Context, canvasID, userID string) (bool, error) {
    queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
    defer cancel()

    var canEdit bool
    err := r.pool.QueryRow(queryCtx, `
        SELECT EXISTS (
            SELECT 1
            FROM canvases c
            WHERE c.id = $1 AND c.owner_id = $2
        ) OR EXISTS (
            SELECT 1
            FROM canvas_shares cs
            WHERE cs.canvas_id = $1 AND cs.user_id = $2::uuid
        )
    `, canvasID, userID).Scan(&canEdit)
    if err != nil {
        return false, err
    }
    return canEdit, nil
}
func normalizeCanvasTitle(title string) string {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return "Untitled Canvas"
	}
	return trimmed
}
