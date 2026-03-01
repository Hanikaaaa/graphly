import * as State from "./state.js";
import * as Render from "./renderer.js";
import * as DOM from "./dom-manager.js";
import { initAIUI } from "./ai-ui.js";
import { initInputHandler, attachNodeHandlers, triggerRedraw } from "./input-handler.js";
import "./panel-interaction.js";
// import { initInputHandler, attachNodeHandlers } from "./input-handler.js";
import { updatePanel } from "./ui-panel.js";
import { getCurrentUser, hasToken, logout } from "./auth.js";
import { renderAuthScreen, renderLoading } from "./auth-ui.js";
import {
  createCanvas,
  deleteCanvas,
  getCanvasByID,
  listCanvases,
  saveCanvasData,
} from "./canvas-api.js";
import { renderCanvasDashboard } from "./dashboard-ui.js";
import {
  flushStateSync,
  getClientID,
  initCollaboration,
  queueStateSync,
  setSyncHandler,
} from "./collaboration.js";

const appContainer = document.querySelector(".app-container");
const authRoot = document.querySelector("#auth-root");
const authActionButton = document.querySelector("#auth-action-btn");
const dashboardButton = document.querySelector("#dashboard-btn");
const saveIndicator = document.querySelector("#save-indicator");

if (!appContainer || !authRoot) {
  document.body.innerHTML = `
    <main class="landing-shell">
      <section class="dashboard-card compact">
        <p>Frontend mount failed. Reload the page.</p>
      </section>
    </main>
  `;
  throw new Error(
    "Missing required root elements: .app-container or #auth-root",
  );
}

let isRuntimeInitialized = false;
let currentUser = null;
let activeCanvas = null;
let autosaveQueue = Promise.resolve();

const dashboardState = {
  loading: false,
  creating: false,
  error: "",
  canvases: [],
};

function setSaveStatus(text, isError = false) {
  if (!saveIndicator) return;
  saveIndicator.textContent = text;
  saveIndicator.classList.toggle("error", isError);
}

export function rebuild() {
  State.clearSelection();
  DOM.clearAllNodes();
  State.nodes.forEach((node) => attachNodeHandlers(node));
  triggerRedraw();
}

function createInitialNodeIfEmpty() {
  if (State.nodes.length > 0) return;

  const node = State.createNodeObject(
    window.innerWidth / 2 - 70,
    window.innerHeight / 2 - 40,
  );

  State.addNode(node);
  attachNodeHandlers(node);
  queueStateSync("node_create");
}

function initializeRuntime() {
  if (isRuntimeInitialized) {
    return;
  }

  isRuntimeInitialized = true;
  Render.resizeCanvas();

  window.addEventListener("resize", () => {
    Render.resizeCanvas();
    triggerRedraw();
  });

  window.addEventListener("beforeunload", () => {
    void flushStateSync();
  });

  initInputHandler();
  initAIUI();
}

function showApp() {
  appContainer.classList.remove("app-hidden");
  authRoot.classList.add("hidden");
  authRoot.innerHTML = "";

  Render.resizeCanvas();
  triggerRedraw();
  setSaveStatus("Saved");
}

function showOverlay() {
  appContainer.classList.add("app-hidden");
  authRoot.classList.remove("hidden");
}

async function persistCanvasSnapshot() {
  if (!activeCanvas) return;

  const snapshot = State.exportCollabState();
  setSaveStatus("Saving...");
  const result = await saveCanvasData(activeCanvas.id, snapshot);
  setSaveStatus(result?.status === "saved" ? "Saved" : "Saved");
}

function enqueueAutosave() {
  if (!activeCanvas) return;

  autosaveQueue = autosaveQueue
    .catch(() => undefined)
    .then(() => persistCanvasSnapshot())
    .catch((error) => {
      setSaveStatus("Save failed", true);
      if (error?.status === 401) {
        void handleLogout();
      }
    });
}

function normalizeCanvasState(data) {
  if (!data || typeof data !== "object") {
    return { nodes: [], connections: [], zoomLevel: 1 };
  }

  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const connections = Array.isArray(data.connections) ? data.connections : [];
  const zoomLevel = typeof data.zoomLevel === "number" ? data.zoomLevel : 1;
  const offsetX = typeof data.offsetX === "number" ? data.offsetX : 0;
  const offsetY = typeof data.offsetY === "number" ? data.offsetY : 0;
  const normalized = { nodes, connections, zoomLevel, offsetX, offsetY };

  if (data.background && typeof data.background === "object") {
    normalized.background = data.background;
  }

  return normalized;
}

async function openCanvas(canvasID) {
  renderLoading(authRoot, "Opening canvas...");
  showOverlay();

  const canvas = await getCanvasByID(canvasID);
  const normalizedState = normalizeCanvasState(canvas.data);

  initializeRuntime();
  State.resetCanvasState();
  State.importCollabState(normalizedState);

  activeCanvas = {
    id: canvas.id,
    title: canvas.title,
    updatedAt: canvas.updatedAt,
  };

  initCollaboration({ room: canvas.id });

  setSyncHandler((_type, content, fromServer, sourceClientID) => {
    if (fromServer) {
      if (sourceClientID && sourceClientID === getClientID()) {
        return;
      }

      if (State.importCollabState(content)) {
        rebuild();
      }
      return;
    }

    enqueueAutosave();
  });

  createInitialNodeIfEmpty();
  showApp();
  setCanvasTitle(canvas.title);
  Render.resizeCanvas();
  triggerRedraw();
  rebuild();
  window.history.replaceState(
    {},
    "",
    `?canvas=${encodeURIComponent(canvas.id)}`,
  );
}

function setCanvasTitle(title) {
  const el = document.getElementById("canvas-name");

  if (!el) {
    console.warn("canvas-name element not found");
    return;
  }

  const safeTitle = title?.trim() || "Untitled Canvas";
  el.textContent = safeTitle;
  el.title = safeTitle;
}

function renderDashboard() {
  showOverlay();

  renderCanvasDashboard(authRoot, {
    userEmail: currentUser?.email || "",
    canvases: dashboardState.canvases,
    loading: dashboardState.loading,
    creating: dashboardState.creating,
    error: dashboardState.error,
    onCreate: async ({ title, accessType, sharedWith }) => {
      dashboardState.creating = true;
      dashboardState.error = "";
      renderDashboard();

      try {
        const created = await createCanvas(title, accessType, sharedWith);
        await refreshDashboard();
        await openCanvas(created.id);
      } catch (error) {
        if (error?.status === 401) {
          await handleLogout();
          return;
        }

        dashboardState.creating = false;
        dashboardState.error = error?.message || "Failed to create canvas.";
        renderDashboard();
      }
    },
    onOpen: async (canvasID) => {
      try {
        await openCanvas(canvasID);
      } catch (error) {
        if (error?.status === 401) {
          await handleLogout();
          return;
        }

        dashboardState.error = error?.message || "Failed to open canvas.";
        renderDashboard();
      }
    },
    onDelete: async (canvasID) => {
      try {
        await deleteCanvas(canvasID);
        await refreshDashboard();
      } catch (error) {
        if (error?.status === 401) {
          await handleLogout();
          return;
        }

        throw error;
      }
    },
    onLogout: () => {
      void handleLogout();
    },
  });
}

async function refreshDashboard() {
  dashboardState.loading = true;
  dashboardState.error = "";
  dashboardState.creating = false;
  renderDashboard();
  let shouldRenderDashboard = true;

  try {
    const canvases = await listCanvases();
    dashboardState.canvases = canvases;
  } catch (error) {
    if (error?.status === 401) {
      await handleLogout();
      shouldRenderDashboard = false;
      return;
    }

    dashboardState.error = error?.message || "Failed to load canvases.";
  } finally {
    dashboardState.loading = false;
    dashboardState.creating = false;
    if (shouldRenderDashboard) {
      renderDashboard();
    }
  }
}

async function showDashboard() {
  if (activeCanvas) {
    setSyncHandler(null);
    activeCanvas = null;
  }

  State.resetCanvasState();
  DOM.clearAllNodes();

  const params = new URLSearchParams(window.location.search);
  params.delete("canvas");
  const query = params.toString();
  const nextURL = query
    ? `${window.location.pathname}?${query}${window.location.hash}`
    : `${window.location.pathname}${window.location.hash}`;
  window.history.replaceState({}, "", nextURL);

  try {
    currentUser = await getCurrentUser();
  } catch (_error) {
    await handleLogout();
    return;
  }

  await refreshDashboard();
}

function showAuth() {
  activeCanvas = null;
  setSyncHandler(null);
  showOverlay();

  renderAuthScreen(authRoot, {
    onAuthenticated: async () => {
      await showDashboard();
    },
  });
}

async function handleLogout() {
  if (activeCanvas) {
    try {
      await flushStateSync();
    } catch (_error) {
      // Best effort before logout.
    }
  }

  setSyncHandler(null);
  activeCanvas = null;
  State.resetCanvasState();
  DOM.clearAllNodes();
  logout();
  showAuth();
}

function restoreCanvasIDFromURL() {
  const params = new URLSearchParams(window.location.search);
  const canvasID = params.get("canvas");
  return canvasID || "";
}

async function bootstrap() {
  showOverlay();
  renderLoading(authRoot, "Checking session...");

  if (!hasToken()) {
    showAuth();
    return;
  }

  try {
    currentUser = await getCurrentUser();
    const canvasID = restoreCanvasIDFromURL();

    if (canvasID) {
      try {
        await openCanvas(canvasID);
        return;
      } catch (error) {
        if (error?.status === 401) {
          throw error;
        }

        dashboardState.error = error?.message || "Failed to open canvas.";
        await refreshDashboard();
        return;
      }
    }

    await refreshDashboard();
  } catch (_error) {
    await handleLogout();
  }
}

if (authActionButton) {
  authActionButton.addEventListener("click", () => {
    void handleLogout();
  });
}

if (dashboardButton) {
  dashboardButton.addEventListener("click", () => {
    void flushStateSync()
      .catch(() => undefined)
      .then(() => showDashboard());
  });
}

void bootstrap().catch((error) => {
  console.error("Bootstrap failed:", error);
  showOverlay();
  renderLoading(
    authRoot,
    "Something went wrong. Hard refresh the page (Ctrl+Shift+R).",
  );
});
