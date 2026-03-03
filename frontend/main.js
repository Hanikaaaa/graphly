import * as State from "./state.js";
import * as Render from "./renderer.js";
import * as DOM from "./dom-manager.js";
import { initAIUI } from "./ai-ui.js";
import { resetAIChat } from "./ai-ui.js";
import { registerAIHooks } from "./ai-ui.js";
import {
  initInputHandler,
  attachNodeHandlers,
  triggerRedraw,
} from "./input-handler.js";
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
  initCollaboration,
  queueStateSync,
  setCollaborationWriteEnabled,
  setSyncHandler,
} from "./collaboration.js";
import { initHoverPreview } from "./hover-preview.js";
import { initMiniMap } from "./minimap.js";
import { canvas as mainCanvas } from "./elements.js";
import {
  exportSelectionAsImage,
  exportSelectionAsPDF,
} from "./selection-export.js";
import { startRegionSelection } from "./export-region.js";

const appContainer = document.querySelector(".app-container");
const authRoot = document.querySelector("#auth-root");
const authActionButton = document.querySelector("#auth-action-btn");
const dashboardButton = document.querySelector("#dashboard-btn");
const saveIndicator = document.querySelector("#save-indicator");
const canvasElement = document.querySelector("#canvas");
const exportPNGButton = document.querySelector("#export-png-btn");
const exportPDFButton = document.querySelector("#export-pdf-btn");
const exportMenuButton = document.querySelector("#export-menu-btn");
const exportMenu = document.querySelector("#export-menu");
let cancelExportSelection = null;

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

export function isCanvasActive() {
  return Boolean(activeCanvas);
}

export function isCanvasEditable() {
  return Boolean(activeCanvas?.canEdit);
}

function setSaveStatus(text, isError = false) {
  if (!saveIndicator) return;
  saveIndicator.textContent = text;
  saveIndicator.classList.toggle("error", isError);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function closeExportMenu() {
  exportMenu?.classList.add("hidden");
}

function openExportMenu() {
  exportMenu?.classList.remove("hidden");
}

function beginRegionExport(format) {
  closeExportMenu();
  cancelExportSelection?.();
  setSaveStatus(`Drag region for ${format.toUpperCase()} export`);

  cancelExportSelection = startRegionSelection(mainCanvas, {
    async onComplete(bounds) {
      try {
        setSaveStatus(`Exporting ${format.toUpperCase()}...`);
        if (format === "png") {
          const blob = await exportSelectionAsImage(mainCanvas, bounds);
          downloadBlob(blob, "graphly-region.png");
        } else {
          const blob = await exportSelectionAsPDF(mainCanvas, bounds);
          downloadBlob(blob, "graphly-region.pdf");
        }
        setSaveStatus("Saved");
      } catch (error) {
        console.error(error);
        setSaveStatus(`Export failed (${format.toUpperCase()})`, true);
      } finally {
        cancelExportSelection = null;
      }
    },
    onCancel() {
      cancelExportSelection = null;
      setSaveStatus(isCanvasEditable() ? "Saved" : "Read-only");
    },
  });
}

async function handleExportSelection(format) {
  if (!isCanvasActive()) {
    setSaveStatus("Open a canvas first", true);
    return;
  }

  beginRegionExport(format);
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
  initMiniMap({ onNavigate: triggerRedraw });
  registerAIHooks({ rebuild });
  initAIUI();
  initHoverPreview();
}

function showApp() {
  appContainer.classList.remove("app-hidden");
  authRoot.classList.add("hidden");
  authRoot.innerHTML = "";
  appContainer.classList.toggle("canvas-readonly", !isCanvasEditable());
  if (canvasElement) {
    if (!isCanvasEditable()) {
      canvasElement.style.cursor = "not-allowed";
    } else {
      canvasElement.style.cursor = "default";
    }
  }

  Render.resizeCanvas();
  triggerRedraw();
  setSaveStatus(isCanvasEditable() ? "Saved" : "Read-only");
}

function showOverlay() {
  appContainer.classList.add("app-hidden");
  authRoot.classList.remove("hidden");
}

async function persistCanvasSnapshot() {
  if (!activeCanvas || !isCanvasEditable()) return;

  const snapshot = State.exportCollabState();
  setSaveStatus("Saving...");
  const result = await saveCanvasData(activeCanvas.id, snapshot);
  setSaveStatus("Saved");
}

function enqueueAutosave() {
  if (!activeCanvas || !isCanvasEditable()) return;

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

function applyIncomingDelta(content) {
  const op = content?.op;
  if (!op || typeof op !== "string") {
    return false;
  }

  if (op === "node_move") {
    const node = State.getNodeById(content.nodeId);
    if (!node) return false;
    if (typeof content.x === "number") node.x = content.x;
    if (typeof content.y === "number") node.y = content.y;
    return true;
  }

  if (op === "nodes_move" && Array.isArray(content.nodes)) {
    let changed = false;
    content.nodes.forEach((entry) => {
      const node = State.getNodeById(entry?.nodeId);
      if (!node) return;
      if (typeof entry.x === "number") node.x = entry.x;
      if (typeof entry.y === "number") node.y = entry.y;
      changed = true;
    });
    return changed;
  }

  if (op === "node_resize") {
    const node = State.getNodeById(content.nodeId);
    if (!node) return false;
    if (typeof content.x === "number") node.x = content.x;
    if (typeof content.y === "number") node.y = content.y;
    if (typeof content.width === "number") node.width = content.width;
    if (typeof content.height === "number") node.height = content.height;
    return true;
  }

  if (op === "nodes_resize" && Array.isArray(content.nodes)) {
    let changed = false;
    content.nodes.forEach((entry) => {
      const node = State.getNodeById(entry?.nodeId);
      if (!node) return;
      if (typeof entry.x === "number") node.x = entry.x;
      if (typeof entry.y === "number") node.y = entry.y;
      if (typeof entry.width === "number") node.width = entry.width;
      if (typeof entry.height === "number") node.height = entry.height;
      changed = true;
    });
    return changed;
  }

  if (op === "node_style") {
    const node = State.getNodeById(content.nodeId);
    if (!node || !content.changes || typeof content.changes !== "object") {
      return false;
    }
    Object.assign(node, content.changes);
    return true;
  }

  if (op === "connection_style") {
    const conn = State.connections.find((c) => c.id === content.connectionId);
    if (!conn || !content.changes || typeof content.changes !== "object") {
      return false;
    }
    Object.assign(conn, content.changes);
    return true;
  }

  return false;
}

async function openCanvas(canvasID) {
  renderLoading(authRoot, "Opening canvas...");
  showOverlay();

  const canvas = await getCanvasByID(canvasID);
  const normalizedState = normalizeCanvasState(canvas.data);

  initializeRuntime();
  resetAIChat();
  State.resetCanvasState();
  State.importCollabState(normalizedState);

  activeCanvas = {
    id: canvas.id,
    title: canvas.title,
    updatedAt: canvas.updatedAt,
    accessType: canvas.accessType || "private",
    canEdit: Boolean(canvas.canEdit ?? true),
  };
  setCollaborationWriteEnabled(activeCanvas.canEdit);

  initCollaboration({ room: canvas.id });

  setSyncHandler((type, content, fromServer) => {
    if (fromServer) {
      if (type === "node_update" && applyIncomingDelta(content)) {
        rebuild();
        return;
      }
      if (State.importCollabState(content)) {
        rebuild();
      }
      return;
    }

    enqueueAutosave();
  });

  if (isCanvasEditable()) {
    createInitialNodeIfEmpty();
  }
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
  setCollaborationWriteEnabled(false);

  resetAIChat();
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
      window.history.replaceState({}, "", "/app");
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
  setCollaborationWriteEnabled(false);
  activeCanvas = null;
  resetAIChat();
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

if (exportMenuButton && exportMenu) {
  exportMenuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (exportMenu.classList.contains("hidden")) {
      openExportMenu();
    } else {
      closeExportMenu();
    }
  });

  exportMenu.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", () => {
    closeExportMenu();
  });
}

if (exportPNGButton) {
  exportPNGButton.addEventListener("click", () => {
    void handleExportSelection("png");
  });
}

if (exportPDFButton) {
  exportPDFButton.addEventListener("click", () => {
    void handleExportSelection("pdf");
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
