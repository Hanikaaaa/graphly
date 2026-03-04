package websocket

import (
	"log"
	"sync"
)

type BroadcastMessage struct {
	roomID string
	data   []byte
	sender *Client
}

type Hub struct {
	register   chan *Client
	unregister chan *Client
	broadcast  chan BroadcastMessage

	mu    sync.RWMutex
	rooms map[string]map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan BroadcastMessage, 256),
		rooms:      make(map[string]map[*Client]struct{}),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			room := h.rooms[client.roomID]
			if room == nil {
				room = make(map[*Client]struct{})
				h.rooms[client.roomID] = room
			}
			room[client] = struct{}{}
			h.mu.Unlock()

		case client := <-h.unregister:
			h.removeClient(client)

		case msg := <-h.broadcast:
			h.broadcastToRoom(msg)
		}
	}
}

func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[client.roomID]
	if room == nil {
		return
	}

	if _, ok := room[client]; ok {
		delete(room, client)
		close(client.send)
		log.Printf("websocket disconnect room=%s", client.roomID)
	}

	if len(room) == 0 {
		delete(h.rooms, client.roomID)
	}
}

func (h *Hub) broadcastToRoom(msg BroadcastMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[msg.roomID]
	if room == nil {
		return
	}

	for client := range room {
		select {
		case client.send <- msg.data:
		default:
			close(client.send)
			delete(room, client)
		}
	}

	if len(room) == 0 {
		delete(h.rooms, msg.roomID)
	}
}

func (h *Hub) ListRooms() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	rooms := make([]string, 0, len(h.rooms))
	for id := range h.rooms {
		rooms = append(rooms, id)
	}

	return rooms
}

func (h *Hub) RoomClientCount(roomID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	return len(h.rooms[roomID])
}
