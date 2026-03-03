import * as State from "../state.js";
import { apiRequest } from "./api-client.js";
import { queueStateSync } from "./collaboration.js";
import { transformAIToGraphlyState } from "./ai-transformer.js";
import { getGraphBounds } from "./geometry/bounds.js";

const aiState = {
  initialized: false,
  messages: [],
  abortController: null,
  outsideClickHandler: null,
  elements: null,
  lastInsertedNodeIds: new Set(),
  lastInsertedConnectionIds: new Set(),
};

const aiHooks = {
  rebuild: () => {},
};

export function registerAIHooks(hooks = {}) {
  if (typeof hooks.rebuild === "function") {
    aiHooks.rebuild = hooks.rebuild;
  }
}

function generateId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneMessage(msg) {
  return { text: msg.text, type: msg.type };
}

function renderMessages() {
  const { messages: messagesEl } = aiState.elements || {};
  if (!messagesEl) return;

  messagesEl.innerHTML = "";
  aiState.messages.forEach((msg) => {
    const div = document.createElement("div");
    div.className = `ai-message ai-${msg.type}`;
    div.textContent = msg.text;
    messagesEl.appendChild(div);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(text, type = "user") {
  aiState.messages.push({ text, type });
  renderMessages();
}

function buildPlacementOffset(existingNodes, incomingNodes) {
  if (!existingNodes.length || !incomingNodes.length) {
    return { x: 0, y: 0 };
  }

  const existingBounds = getGraphBounds(existingNodes);
  const incomingBounds = getGraphBounds(incomingNodes);
  if (!existingBounds || !incomingBounds) {
    return { x: 0, y: 0 };
  }

  const horizontalGapWorld = 220 / Math.max(0.3, State.zoomLevel || 1);
  return {
    x: existingBounds.maxX + horizontalGapWorld - incomingBounds.minX,
    y: existingBounds.minY - incomingBounds.minY,
  };
}

function normalizeAndRelinkAIData(transformed) {
  const idMap = new Map();
  const nodes = transformed.nodes.map((node) => {
    const newId = generateId();
    idMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
      connections: [],
    };
  });

  const connections = transformed.connections
    .map((conn) => {
      const from = idMap.get(conn.from);
      const to = idMap.get(conn.to);
      if (!from || !to) return null;

      return {
        ...conn,
        id: generateId(),
        from,
        to,
        label: typeof conn.label === "string" ? conn.label : "",
      };
    })
    .filter(Boolean);

  return { nodes, connections };
}

function mergeGraphIntoCanvas(transformed) {
  const normalized = normalizeAndRelinkAIData(transformed);
  const offset = buildPlacementOffset(State.nodes, normalized.nodes);

  const offsetNodes = normalized.nodes.map((node) => ({
    ...node,
    x: node.x + offset.x,
    y: node.y + offset.y,
  }));

  State.snapshotState();
  offsetNodes.forEach((node) => {
    State.addNode(node);
    aiState.lastInsertedNodeIds.add(node.id);
  });
  normalized.connections.forEach((conn) => {
    State.connections.push(conn);
    aiState.lastInsertedConnectionIds.add(conn.id);
  });
}

function removeLastInsertedAIGraph() {
  if (!aiState.lastInsertedNodeIds.size && !aiState.lastInsertedConnectionIds.size) {
    return;
  }

  State.removeNodesAndConnections(
    aiState.lastInsertedNodeIds,
    aiState.lastInsertedConnectionIds,
  );

  aiState.lastInsertedNodeIds.clear();
  aiState.lastInsertedConnectionIds.clear();
}

function reapplyLastAIGraphLayout() {
  if (!State.lastAIGraph) return;

  State.snapshotState();
  removeLastInsertedAIGraph();
  const transformed = transformAIToGraphlyState(State.lastAIGraph);
  mergeGraphIntoCanvas(transformed);
  aiHooks.rebuild();
  queueStateSync("node_update");
}

function closeChatbox() {
  aiState.elements?.chatbox?.classList.add("hidden");
}

function openChatbox() {
  const { chatbox, input } = aiState.elements || {};
  if (!chatbox) return;
  chatbox.classList.remove("hidden");
  input?.focus();
}

function registerOutsideClickClose() {
  if (aiState.outsideClickHandler) return;

  aiState.outsideClickHandler = (event) => {
    const { chatbox, fab } = aiState.elements || {};
    if (!chatbox || chatbox.classList.contains("hidden")) return;

    const target = event.target;
    if (chatbox.contains(target) || fab?.contains(target)) return;
    closeChatbox();
  };

  document.addEventListener("mousedown", aiState.outsideClickHandler);
}

export function resetAIChat() {
  if (aiState.abortController) {
    aiState.abortController.abort();
    aiState.abortController = null;
  }

  aiState.messages = [
    { text: "Describe the graph you want to generate.", type: "system" },
  ];
  aiState.lastInsertedNodeIds.clear();
  aiState.lastInsertedConnectionIds.clear();
  State.setLastAIGraph(null);
  renderMessages();
  closeChatbox();
}

export function initAIUI() {
  if (aiState.initialized) return;

  const fab = document.getElementById("ai-fab");
  const chatbox = document.getElementById("ai-chatbox");
  const closeBtn = document.getElementById("ai-close-btn");
  const input = document.getElementById("ai-input");
  const sendBtn = document.getElementById("ai-send-btn");
  const messages = document.getElementById("ai-messages");
  const treeBtn = document.getElementById("layout-tree-btn");
  const radialBtn = document.getElementById("layout-radial-btn");

  if (!fab || !chatbox || !closeBtn || !input || !sendBtn || !messages) return;

  aiState.initialized = true;
  aiState.elements = { fab, chatbox, closeBtn, input, sendBtn, messages };
  resetAIChat();

  fab.addEventListener("click", () => {
    if (chatbox.classList.contains("hidden")) {
      openChatbox();
    } else {
      closeChatbox();
    }
  });

  closeBtn.addEventListener("click", closeChatbox);
  registerOutsideClickClose();

  async function handleSend() {
    const value = input.value.trim();
    if (!value) return;

    appendMessage(value, "user");
    input.value = "";

    if (aiState.abortController) {
      aiState.abortController.abort();
    }
    aiState.abortController = new AbortController();

    try {
      appendMessage("Generating graph...", "system");

      const graph = await apiRequest("/ai/generate", {
        method: "POST",
        body: { prompt: value },
        signal: aiState.abortController.signal,
      });

      State.setLastAIGraph(graph);

      const transformed = transformAIToGraphlyState(graph);
      mergeGraphIntoCanvas(transformed);

      aiHooks.rebuild();
      queueStateSync("node_update");
      appendMessage("Graph generated successfully.", "system");
    } catch (err) {
      if (err?.name === "AbortError") {
        appendMessage("Generation canceled.", "system");
      } else {
        console.error(err);
        appendMessage("Failed to generate graph.", "system");
      }
    } finally {
      aiState.abortController = null;
    }
  }

  sendBtn.addEventListener("click", handleSend);
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleSend();
  });

  treeBtn?.addEventListener("click", () => {
    if (!State.lastAIGraph) return;
    State.setLayoutMode("tree");
    reapplyLastAIGraphLayout();
  });

  radialBtn?.addEventListener("click", () => {
    if (!State.lastAIGraph) return;
    State.setLayoutMode("radial");
    reapplyLastAIGraphLayout();
  });
}

export function getAIChatHistory() {
  return aiState.messages.map(cloneMessage);
}
