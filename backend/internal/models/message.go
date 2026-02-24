package models

import "encoding/json"

const (
    MessageNodeCreate = "node_create"
    MessageNodeUpdate = "node_update"
    MessageNodeDelete = "node_delete"
    MessageCursorMove = "cursor_move"
)

type Message struct {
    Type   string          `json:"type"`
    RoomID string          `json:"roomId"`
    UserID string          `json:"userId"`
    Payload json.RawMessage `json:"payload"`
}

func IsValidType(t string) bool {
    switch t {
    case MessageNodeCreate, MessageNodeUpdate, MessageNodeDelete, MessageCursorMove:
        return true
    default:
        return false
    }
}
