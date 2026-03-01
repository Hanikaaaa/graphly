import * as State from "./state.js";

let ws = null;
let roomId = null;
let reconnectTimer = null;
const clientID =
  globalThis.crypto?.randomUUID?.() ||
  `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;

let onSync = null;         // callback to notify app after sending/receiving
let pendingTimer = null;
let pendingType = "node_update";
let pendingContent = {};

const RECONNECT_DELAY = 2000; // ms

export function initCollaboration(options = {}) {
  roomId = options.room;
  if (!roomId) throw new Error("room ID is required");
  onSync = typeof options.onSync === "function" ? options.onSync : null;

  connectWS();
}

export function setSyncHandler(handler) {
  onSync = typeof handler === "function" ? handler : null;
}

export function getClientID() {
  return clientID;
}

function connectWS() {
  if (!roomId) return;

  ws = new WebSocket(`ws://localhost:8080/ws/${roomId}`);

  ws.onopen = () => {
    console.log("[Collab] WebSocket connected");
    if (pendingTimer) flushStateSync(); // send any pending updates
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const content = msg.payload ?? msg.content ?? {};
      if (onSync) onSync(msg.type, content, true, msg.userId || "");
    } catch (err) {
      console.error("[Collab] Invalid message", err);
    }
  };

  ws.onclose = () => {
    console.warn("[Collab] WebSocket closed, retrying...");
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    console.error("[Collab] WebSocket error", err);
    ws.close();
  };
}

/**
 * Retry connecting after a delay
 */
function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWS();
  }, RECONNECT_DELAY);
}

/**
 * Immediately broadcast state
 */
export function broadcastState(type = "node_update", content = {}) {
  const hasContent =
    content && typeof content === "object" && Object.keys(content).length > 0;
  const snapshot = hasContent ? content : State.exportCollabState();

  if (onSync) onSync(type, snapshot, false, clientID);

  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const payload = { type, roomId, userId: clientID, payload: snapshot };
  ws.send(JSON.stringify(payload));
}

/**
 * Queue state for debounced broadcasting
 */
export function queueStateSync(type = "node_update", content = {}, delayMs = 700) {
  pendingType = type;
  pendingContent = content;

  if (pendingTimer) clearTimeout(pendingTimer);

  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    broadcastState(pendingType, pendingContent);
  }, delayMs);
}

/**
 * Flush any pending sync immediately
 */
export async function flushStateSync() {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  broadcastState(pendingType, pendingContent);
}
