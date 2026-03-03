import * as State from "./state.js";
import * as Render from "./renderer.js";
import * as DOM from "./dom-manager.js";
import { canvas, buttons } from "./elements.js";
import { updatePanel } from "./ui-panel.js";
import { rebuild } from "./main.js";
import { queueStateSync, sendDelta } from "./collaboration.js";
import { ShapeRegistry } from "./shapes.js";
import { updateGroupOverlay } from "./dom-manager.js";
import { getGroupOverlay } from "./dom-manager.js";
import { getSelectionBounds } from "./geometry/bounds.js";
import { hitTestConnection } from "./interaction/hit-test.js";
import { startPan, handlePanMove } from "./interaction/pan.js";
import { handleDragPending, handleDragMove } from "./interaction/drag.js";
import { handleMarqueeMove } from "./interaction/marquee.js";
import { handleNodeResize } from "./interaction/resize.js";
import { handleConnectMove, handleConnectEnd } from "./interaction/connect.js";
import { isCanvasActive, isCanvasEditable } from "./main.js";
import {
  handleGroupDragMove,
  startGroupDrag,
} from "./interaction/group-drag.js";
import {
  applyGroupResize,
  startGroupResize,
} from "./interaction/group-resize.js";
import { hideHoverPreview, showHoverPreview } from "./hover-preview.js";
import { renderMiniMap } from "./minimap.js";

let isSpacePressed = false;
const DRAG_THRESHOLD = 4;
let externalRedraw = null;

let interaction = {
  mode: "idle", // idle | dragPending | drag | resize | groupDrag | groupResize | pan | marquee | connect

  startX: 0,
  startY: 0,

  lastClientX: 0,
  lastClientY: 0,

  nodeId: null,
  resizeDir: null,

  connectionSourceId: null,
  connectionCurrentX: 0,
  connectionCurrentY: 0,

  dragStartPositions: new Map(),

  panStartX: 0,
  panStartY: 0,
  startOffsetX: 0,
  startOffsetY: 0,

  marqueeStartX: 0,
  marqueeStartY: 0,
  marqueeCurrentX: 0,
  marqueeCurrentY: 0,

  groupResizeHandle: null,
  groupBounds: null,
  groupInitialNodes: new Map(),
};

export function registerRedraw(fn) {
  externalRedraw = fn;
}

export function triggerRedraw() {
  externalRedraw?.();
}

export function attachNodeHandlers(node) {
  DOM.createNodeDOM(node, {
    onSelect(id, event) {
      if (!isCanvasEditable()) return;
      if (event?.shiftKey) {
        State.toggleNodeSelection(id);
      } else {
        State.selectSingleNode(id);
      }
      redraw();
    },

    onEdit(id) {
      if (!isCanvasEditable()) return;
      State.setEditingNodeId(id);
      redraw();
    },

    onSave(id, value) {
      if (!isCanvasEditable()) return;
      const n = State.getNodeById(id);
      if (!n) return;

      State.snapshotState();
      n.text = value.trim();
      State.setEditingNodeId(null);
      redraw();
      queueStateSync("node_update");
    },

    onDragStart(e, id) {
      if (!isCanvasEditable()) return;
      if (State.editingNodeId) return;

      // If multiple nodes selected → let group logic handle it
      if (State.selectedNodeIds.size > 1) {
        return;
      }

      interaction.mode = "dragPending";
      interaction.startX = e.clientX;
      interaction.startY = e.clientY;
      interaction.nodeId = id;
    },

    onConnectStart(e, id) {
      if (!isCanvasEditable()) return;
      e.stopPropagation();
      e.preventDefault();
      interaction.mode = "connect";
      interaction.connectionSourceId = id;
      interaction.connectionCurrentX = e.clientX;
      interaction.connectionCurrentY = e.clientY;
    },

    onResizeStart(e, id, direction) {
      if (!isCanvasEditable()) return;
      e.stopPropagation();

      const node = State.getNodeById(id);
      if (!node) return;

      State.snapshotState();

      interaction.mode = "resize";
      interaction.nodeId = id;
      interaction.resizeDir = direction;

      interaction.lastClientX = e.clientX;
      interaction.lastClientY = e.clientY;
    },
  });
}

export function initInputHandler() {
  registerOverlayEvents();
  registerCanvasEvents();
  registerGlobalEvents();
  registerToolbarEvents();

  window.addEventListener("node-hover-change", () => {
    triggerRedraw();
  });
}

function resetInteraction() {
  interaction.mode = "idle";
  interaction.nodeId = null;
  interaction.resizeDir = null;
  interaction.groupResizeHandle = null;
  interaction.groupBounds = null;
  interaction.connectionSourceId = null;
  interaction.dragStartPositions.clear();
}

export function redraw() {
  const marqueeData =
    interaction.mode === "marquee"
      ? {
          startX: interaction.marqueeStartX,
          startY: interaction.marqueeStartY,
          currentX: interaction.marqueeCurrentX,
          currentY: interaction.marqueeCurrentY,
        }
      : null;

  const connectionPreview =
    interaction.mode === "connect"
      ? {
          sourceId: interaction.connectionSourceId,
          currentX: interaction.connectionCurrentX,
          currentY: interaction.connectionCurrentY,
        }
      : null;

  Render.renderScene(
    State.nodes,
    State.connections,
    State.zoomLevel,
    marqueeData,
    connectionPreview,
  );
  renderMiniMap();

  State.nodes.forEach((node) => {
    DOM.syncNodeDOM(node, {
      isSelected: State.selectedNodeIds.has(node.id),
      isEditing: node.id === State.editingNodeId,
      zoomLevel: State.zoomLevel,
      offsetX: State.offsetX,
      offsetY: State.offsetY,
    });
  });
  const bounds = getSelectionBounds(State.nodes, State.selectedNodeIds);

  updateGroupOverlay({
    bounds,
    zoomLevel: State.zoomLevel,
    offsetX: State.offsetX,
    offsetY: State.offsetY,
  });

  updatePanel();
}

registerRedraw(redraw);

const MOVE_HANDLERS = {
  pan: (e) => handlePanMove(interaction, e, State, redraw),

  groupResize: (e) => {
    const applied = applyGroupResize(interaction, e, State);
    if (applied) redraw();
  },

  groupDrag: (e) => handleGroupDragMove(interaction, e, State, redraw),

  dragPending: (e) => handleDragPending(interaction, e, State, DRAG_THRESHOLD),

  drag: (e) => handleDragMove(interaction, e, State, redraw),

  resize: (e) => handleNodeResize(interaction, e, State, ShapeRegistry, redraw),

  connect: (e) => handleConnectMove(interaction, e, redraw),

  marquee: (e) => handleMarqueeMove(interaction, e, State, redraw),
};

const UP_HANDLERS = {
  connect: () =>
    handleConnectEnd(interaction, State, attachNodeHandlers, queueStateSync),

  drag: () => {
    if (!interaction.dragStartPositions.size) return;
    const movedNodes = [];
    interaction.dragStartPositions.forEach((_startPos, id) => {
      const node = State.getNodeById(id);
      if (!node) return;
      movedNodes.push({ nodeId: id, x: node.x, y: node.y });
    });

    if (!movedNodes.length) return;
    if (movedNodes.length === 1) {
      const only = movedNodes[0];
      sendDelta("node_move", only);
      return;
    }

    sendDelta("nodes_move", { nodes: movedNodes });
  },

  groupDrag: () => {
    const movedNodes = [];
    interaction.dragStartPositions.forEach((_startPos, id) => {
      const node = State.getNodeById(id);
      if (!node) return;
      movedNodes.push({ nodeId: id, x: node.x, y: node.y });
    });
    if (movedNodes.length) {
      sendDelta("nodes_move", { nodes: movedNodes });
    }
  },

  groupResize: (e) => {
    applyGroupResize(interaction, e, State);
    const resizedNodes = [];
    interaction.groupInitialNodes.forEach((_initial, id) => {
      const node = State.getNodeById(id);
      if (!node) return;
      resizedNodes.push({
        nodeId: id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      });
    });
    if (resizedNodes.length) {
      sendDelta("nodes_resize", { nodes: resizedNodes });
    }
  },

  resize: () => {
    const node = State.getNodeById(interaction.nodeId);
    if (!node) return;
    sendDelta("node_resize", {
      nodeId: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    });
  },
};

function handleWindowDoubleClick(e) {
  if (!isCanvasActive() || !isCanvasEditable()) return;
  if (e.target.closest(".node-input")) return;

  const rect = canvas.getBoundingClientRect();

  const x = (e.clientX - rect.left - State.offsetX) / State.zoomLevel;
  const y = (e.clientY - rect.top - State.offsetY) / State.zoomLevel;

  State.snapshotState();

  const node = State.createNodeObject(x - 70, y - 40);

  State.addNode(node);
  attachNodeHandlers(node);
  State.selectSingleNode(node.id);

  redraw();
  queueStateSync("node_create");
}

function registerCanvasEvents() {
  canvas.addEventListener("mousemove", (e) => {
    MOVE_HANDLERS[interaction.mode]?.(e);

    if (interaction.mode !== "idle") {
      if (State.hoveredConnectionId !== null) {
        State.setHoveredConnectionId(null);
        triggerRedraw();
      }
      return;
    }

    const worldX = (e.clientX - State.offsetX) / State.zoomLevel;
    const worldY = (e.clientY - State.offsetY) / State.zoomLevel;
    const hoveredConn = hitTestConnection(
      worldX,
      worldY,
      State.connections,
      State.getNodeById,
      State.zoomLevel,
    );
    const hoveredId = hoveredConn?.id || null;

    if (State.hoveredConnectionId !== hoveredId) {
      State.setHoveredConnectionId(hoveredId);
      canvas.style.cursor = hoveredId ? "pointer" : "default";
      if (hoveredId) {
        const conn = State.connections.find((c) => c.id === hoveredId);
        showHoverPreview({
          type: "edge",
          label: conn?.label || "",
        });
      } else {
        hideHoverPreview();
      }
      triggerRedraw();
    }
  });

  canvas.addEventListener("mousedown", handleCanvasMouseDown);

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      State.setOffset(State.offsetX - e.deltaX, State.offsetY - e.deltaY);
      triggerRedraw();
    },
    { passive: false },
  );
}

function handleCanvasMouseDown(e) {
  if (!isCanvasEditable()) {
    if (e.button === 1 || isSpacePressed) {
      startPan(interaction, e, State);
      return;
    }
    return;
  }

  if (interaction.mode === "connect") return;
  const worldX = (e.clientX - State.offsetX) / State.zoomLevel;
  const worldY = (e.clientY - State.offsetY) / State.zoomLevel;

  const clickedConnection = hitTestConnection(
    worldX,
    worldY,
    State.connections,
    State.getNodeById,
    State.zoomLevel,
  );

  if (clickedConnection) {
    State.selectSingleConnection(clickedConnection.id);
    redraw();
    return;
  }

  if (e.button === 1 || isSpacePressed) {
    startPan(interaction, e, State);
    return;
  }

  const bounds = getSelectionBounds(State.nodes, State.selectedNodeIds);

  if (bounds) {
    const handleSize = 10 / State.zoomLevel;

    const handles = {
      br: { x: bounds.maxX, y: bounds.maxY },
      bl: { x: bounds.minX, y: bounds.maxY },
      tr: { x: bounds.maxX, y: bounds.minY },
      tl: { x: bounds.minX, y: bounds.minY },
    };

    for (const key in handles) {
      const h = handles[key];

      const hit =
        worldX >= h.x - handleSize &&
        worldX <= h.x + handleSize &&
        worldY >= h.y - handleSize &&
        worldY <= h.y + handleSize;

      if (hit) {
        startGroupResize(interaction, e, bounds, State, key);
        return;
      }
    }

    const inside =
      worldX >= bounds.minX &&
      worldX <= bounds.maxX &&
      worldY >= bounds.minY &&
      worldY <= bounds.maxY;

    if (inside) {
      startGroupDrag(interaction, e, State);
      return;
    }
  }

  interaction.mode = "marquee";
  interaction.marqueeStartX = e.clientX;
  interaction.marqueeStartY = e.clientY;
  interaction.marqueeCurrentX = e.clientX;
  interaction.marqueeCurrentY = e.clientY;

  State.clearSelection();
  redraw();
}

function registerGlobalEvents() {
  window.addEventListener("mousemove", (e) => {
    MOVE_HANDLERS[interaction.mode]?.(e);
  });

  window.addEventListener("mouseup", (e) => {
    UP_HANDLERS[interaction.mode]?.(e);
    resetInteraction();
    redraw();
  });

  window.addEventListener("keydown", (e) => {
    if (!isCanvasEditable()) {
      if (e.code === "Space") {
        isSpacePressed = true;
        canvas.style.cursor = "grab";
      }
      return;
    }

    if (e.key === "Delete" && State.selectedNodeIds.size > 0) {
      State.snapshotState();

      Array.from(State.selectedNodeIds).forEach((id) => {
        State.deleteNodeLogic(id, e.shiftKey);
      });

      State.clearSelection();
      redraw();
      queueStateSync("node_delete");
    }

    if (e.code === "Space") {
      isSpacePressed = true;
      canvas.style.cursor = "grab";
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      isSpacePressed = false;
      canvas.style.cursor = isCanvasEditable() ? "default" : "not-allowed";
    }
  });

  window.addEventListener("dblclick", handleWindowDoubleClick);
}

function registerToolbarEvents() {
  buttons.zoomIn.onclick = () => {
    State.setZoomLevel(Math.min(State.zoomLevel + 0.1, 3));
    redraw();
  };

  buttons.zoomOut.onclick = () => {
    State.setZoomLevel(Math.max(State.zoomLevel - 0.1, 0.3));
    redraw();
  };

  buttons.undo.onclick = () => {
    if (!isCanvasEditable()) return;
    if (State.undo()) {
      rebuild();
      queueStateSync("node_update");
    }
  };

  buttons.redo.onclick = () => {
    if (!isCanvasEditable()) return;
    if (State.redo()) {
      rebuild();
      queueStateSync("node_update");
    }
  };
}

function registerOverlayEvents() {
  document.addEventListener("mousedown", (e) => {
    const overlay = getGroupOverlay();
    if (!overlay) return;

    const handle = e.target.closest(".group-handle");
    if (!handle) return;

    e.stopPropagation();

    const dir = handle.dataset.dir;

    const bounds = getSelectionBounds(State.nodes, State.selectedNodeIds);

    if (!bounds) return;

    startGroupResize(interaction, e, bounds, State, dir);
  });
}
