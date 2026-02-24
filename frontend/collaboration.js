import * as State from "./state.js";

const allowedTypes = new Set([
  "node_create",
  "node_update",
  "node_delete",
  "cursor_move",
]);

let ws = null;
let roomId = "default-room";
let userId = null;
let onRemoteState = null;
let pendingTimer = null;

function generateId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeUserId() {
  const key = "pixplot_user_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = generateId();
  localStorage.setItem(key, id);
  return id;
}

function getRoomId() {
  const params = new URLSearchParams(window.location.search);
  const queryRoom = params.get("room");
  if (queryRoom) return queryRoom;

  const hashRoom = window.location.hash.replace(/^#/, "").trim();
  if (hashRoom) return hashRoom;

  return "default-room";
}

function socketURL() {
  const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsHost = window.location.hostname;
  const wsPort = "8080";
  return `${wsProtocol}://${wsHost}:${wsPort}/ws/${encodeURIComponent(roomId)}`;
}


function send(type) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (!allowedTypes.has(type)) return;

  const msg = {
    type,
    roomId,
    userId,
    payload: {
      kind: "state_sync",
      state: State.exportCollabState(),
      sentAt: Date.now(),
    },
  };

  ws.send(JSON.stringify(msg));
}

function applyIncoming(raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (!msg || !allowedTypes.has(msg.type)) return;
  if (msg.roomId !== roomId) return;
  if (msg.userId === userId) return;
  if (!msg.payload || msg.payload.kind !== "state_sync") return;
  if (!msg.payload.state) return;

  const incomingNodes = Array.isArray(msg.payload.state.nodes) ? msg.payload.state.nodes.length : 0;
  const localNodes = State.nodes.length;
  // Guard against an empty remote snapshot wiping active local work.
  if (incomingNodes === 0 && localNodes > 0) return;

  if (!onRemoteState) return;

  onRemoteState(msg.payload.state);
}

function connect() {
  ws = new WebSocket(socketURL());

  ws.onopen = () => {
    send("cursor_move");
  };

  ws.onmessage = (event) => {
    applyIncoming(event.data);
  };

  ws.onclose = () => {
    window.setTimeout(connect, 1500);
  };

  ws.onerror = () => {
    if (ws) ws.close();
  };
}

export function initCollaboration(options = {}) {
  roomId = getRoomId();
  userId = makeUserId();
  onRemoteState = options.onRemoteState || null;
  connect();
}

export function broadcastState(type = "node_update") {
  send(type);
}

export function queueStateSync(type = "node_update", delayMs = 80) {
  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
  }

  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    send(type);
  }, delayMs);
}
