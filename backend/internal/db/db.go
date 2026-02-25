package db

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	pool   *pgxpool.Pool
	poolMu sync.RWMutex
)

var ErrDatabaseNotInitialized = errors.New("database pool is not initialized")

func InitDB(ctx context.Context) (*pgxpool.Pool, error) {
	poolMu.RLock()
	if pool != nil {
		defer poolMu.RUnlock()
		return pool, nil
	}
	poolMu.RUnlock()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, errors.New("DATABASE_URL is not set")
	}

	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}

	nextPool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pgx pool: %w", err)
	}

	if err := nextPool.Ping(ctx); err != nil {
		nextPool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	poolMu.Lock()
	defer poolMu.Unlock()

	if pool != nil {
		nextPool.Close()
		return pool, nil
	}

	pool = nextPool
	return pool, nil
}

func Pool() (*pgxpool.Pool, error) {
	poolMu.RLock()
	defer poolMu.RUnlock()

	if pool == nil {
		return nil, ErrDatabaseNotInitialized
	}

	return pool, nil
}

func CloseDB() {
	poolMu.Lock()
	defer poolMu.Unlock()

	if pool != nil {
		pool.Close()
		pool = nil
	}
}
