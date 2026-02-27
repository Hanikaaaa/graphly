package db

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"graphly/backend/internal/models"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrEmailAlreadyInUse = errors.New("email already in use")
)

type UserWithPassword struct {
	ID           string
	Email        string
	PasswordHash string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) CreateUser(ctx context.Context, email, passwordHash string) (*models.User, error) {
	user := &models.User{
		ID:    uuid.NewString(),
		Email: email,
	}

	query := `
		INSERT INTO users (id, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING created_at, updated_at
	`

	err := r.pool.QueryRow(ctx, query, user.ID, user.Email, passwordHash).Scan(&user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if isEmailUniqueViolation(err) {
			return nil, ErrEmailAlreadyInUse
		}
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*UserWithPassword, error) {
	user := &UserWithPassword{}
	query := `
		SELECT id, email, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1
		LIMIT 1
	`

	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, created_at, updated_at
		FROM users
		WHERE id = $1
		LIMIT 1
	`

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

func isEmailUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}

	return pgErr.Code == "23505" && strings.Contains(strings.ToLower(pgErr.ConstraintName), "email")
}
func (r *UserRepository) GetUserIDsByEmails(ctx context.Context, emails []string) ([]string, error) {
    if len(emails) == 0 {
        return []string{}, nil
    }

    queryCtx, cancel := context.WithTimeout(ctx, defaultDBTimeout)
    defer cancel()

    rows, err := r.pool.Query(queryCtx, `
        SELECT id
        FROM users
        WHERE email = ANY($1)
    `, emails)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    ids := make([]string, 0)
    for rows.Next() {
        var id string
        if err := rows.Scan(&id); err != nil {
            return nil, err
        }
        ids = append(ids, id)
    }
    if err := rows.Err(); err != nil {
        return nil, err
    }

    return ids, nil
}