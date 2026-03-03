import { rebuild } from "../main.js";
import * as State from "../state.js";
import { apiRequest } from "./api-client.js";
import { queueStateSync } from "./collaboration.js";
import { transformAIToGraphlyState } from "./ai-transformer.js";

export function initAIUI() {
  const fab = document.getElementById("ai-fab");
  const chatbox = document.getElementById("ai-chatbox");
  const closeBtn = document.getElementById("ai-close-btn");
  const input = document.getElementById("ai-input");
  const sendBtn = document.getElementById("ai-send-btn");
  const messages = document.getElementById("ai-messages");
  const treeBtn = document.getElementById("layout-tree-btn");
  const radialBtn = document.getElementById("layout-radial-btn");

  if (!fab || !chatbox) return;

  fab.addEventListener("click", () => {
    chatbox.classList.toggle("hidden");
    input.focus();
  });

  closeBtn.addEventListener("click", () => {
    chatbox.classList.add("hidden");
  });

  function appendMessage(text, type = "user") {
    const div = document.createElement("div");
    div.className = `ai-message ai-${type}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  async function handleSend() {
    const value = input.value.trim();
    if (!value) return;

    appendMessage(value, "user");
    input.value = "";

    try {
      appendMessage("Generating graph...", "system");

      const graph = await apiRequest("/ai/generate", {
        method: "POST",
        body: { prompt: value },
      });

      // Replace current canvas with AI graph
      State.snapshotState();
      State.setLastAIGraph(graph);

      const transformed = transformAIToGraphlyState(graph);

      State.importCollabState({
        nodes: transformed.nodes,
        connections: transformed.connections,
        zoomLevel: 1,
        offsetX: 200,
        offsetY: 100,
      });

      rebuild();
      queueStateSync("node_update");

      appendMessage("Graph generated successfully.", "system");
    } catch (err) {
      console.error(err);
      appendMessage("Failed to generate graph.", "system");
    }
  }

  sendBtn.addEventListener("click", handleSend);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  });

  treeBtn?.addEventListener("click", () => {
    if (!State.lastAIGraph) return;

    State.setLayoutMode("tree");

    const transformed = transformAIToGraphlyState(State.lastAIGraph);

    State.importCollabState({
      nodes: transformed.nodes,
      connections: transformed.connections,
      zoomLevel: State.zoomLevel || 1,
      offsetX: State.offsetX || 0,
      offsetY: State.offsetY || 0,
    });

    rebuild();
  });

  radialBtn?.addEventListener("click", () => {
    if (!State.lastAIGraph) return;

    State.setLayoutMode("radial");

    const transformed = transformAIToGraphlyState(State.lastAIGraph);

    State.importCollabState({
      nodes: transformed.nodes,
      connections: transformed.connections,
      zoomLevel: State.zoomLevel || 1,
      offsetX: State.offsetX || 0,
      offsetY: State.offsetY || 0,
    });

    rebuild();
  });
}
