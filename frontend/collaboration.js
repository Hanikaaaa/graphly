let onSync = null;
let pendingTimer = null;
let pendingType = "node_update";

export function initCollaboration(options = {}) {
  onSync = typeof options.onSync === "function" ? options.onSync : null;
}

export function setSyncHandler(handler) {
  onSync = typeof handler === "function" ? handler : null;
}

export function broadcastState(type = "node_update") {
  if (!onSync) return;
  void onSync(type);
}

export function queueStateSync(type = "node_update", delayMs = 700) {
  if (!onSync) return;

  pendingType = type;
  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
  }

  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    void onSync(pendingType);
  }, delayMs);
}

export async function flushStateSync() {
  if (!onSync) return;

  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
    pendingTimer = null;
  }

  await onSync(pendingType);
}
