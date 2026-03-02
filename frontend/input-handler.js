import * as State from "./state.js";
import * as Render from "./renderer.js";
import * as DOM from "./dom-manager.js";
import { canvas, buttons } from "./elements.js";
import { updatePanel } from "./ui-panel.js";
import { rebuild } from "./main.js";
import { queueStateSync } from "./collaboration.js";
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
import {
  handleGroupDragMove,
  startGroupDrag,
} from "./interaction/group-drag.js";
import {
  applyGroupResize,
  startGroupResize,
} from "./interaction/group-resize.js";

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
      if (event?.shiftKey) {
        State.toggleNodeSelection(id);
      } else {
        State.selectSingleNode(id);
      }
      redraw();
    },

    onEdit(id) {
      State.setEditingNodeId(id);
      redraw();
    },

    onSave(id, value) {
      const n = State.getNodeById(id);
      if (!n) return;

      State.snapshotState();
      n.text = value.trim();
      State.setEditingNodeId(null);
      redraw();
      queueStateSync("node_update");
    },

    onDragStart(e, id) {
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
      e.stopPropagation();
      e.preventDefault();
      interaction.mode = "connect";
      interaction.connectionSourceId = id;
      interaction.connectionCurrentX = e.clientX;
      interaction.connectionCurrentY = e.clientY;
    },

    onResizeStart(e, id, direction) {
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

  groupDrag: () => queueStateSync("node_update"),

  groupResize: (e) => {
    applyGroupResize(interaction, e, State);
    queueStateSync("node_update");
  },
};

function handleWindowDoubleClick(e) {
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
  });

  canvas.addEventListener("mousedown", handleCanvasMouseDown);

  canvas.addEventListener("dblclick", () => {
    console.log("DOUBLE CLICK FIRED");
  });

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
      canvas.style.cursor = "default";
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
    if (State.undo()) {
      rebuild();
      queueStateSync("node_update");
    }
  };

  buttons.redo.onclick = () => {
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
