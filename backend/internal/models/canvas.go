package models

import (
	"encoding/json"
	"time"
)

type Canvas struct {
	ID        string          `json:"id" db:"id"`
	OwnerID   string          `json:"ownerId" db:"owner_id"`
	Title     string          `json:"title" db:"title"`
	Data      json.RawMessage `json:"data,omitempty" db:"data"`
	CreatedAt time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time       `json:"updatedAt" db:"updated_at"`
	AccessType string   	  `json:"accessType"`
	SharedWith []string 	  `json:"sharedWith"`
	CanEdit    bool            `json:"canEdit"`
}

type CanvasListItem struct {
	ID        string    `json:"id" db:"id"`
	Title     string    `json:"title" db:"title"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
	AccessType string    `json:"accessType"`
    OwnerEmail    string    `json:"ownerEmail"`
}
