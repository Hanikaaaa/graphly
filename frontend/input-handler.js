import * as State from "./state.js";
import * as Render from "./renderer.js";
import * as DOM from "./dom-manager.js";
import { canvas, buttons } from "./elements.js";
import { updatePanel } from "./ui-panel.js";
import { rebuild } from "./main.js";
import { queueStateSync } from "./collaboration.js";
import { ShapeRegistry } from "./shapes.js";

let isPointerDown = false;
let pointerDownX = 0;
let pointerDownY = 0;

let potentialDragNodeId = null;
let isDraggingNode = false;

let dragStartPositions = new Map();

let isDrawingConnection = false;
let connectionSource = null;

let isResizing = false;
let resizeNodeId = null;
let resizeDir = null;

let startX = 0;
let startY = 0;
let startW = 0;
let startH = 0;
let startNodeX = 0;
let startNodeY = 0;

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let startOffsetX = 0;
let startOffsetY = 0;
let isSpacePressed = false;

const DRAG_THRESHOLD = 4;
let externalRedraw = null;

export function registerRedraw(fn) {
  externalRedraw = fn;
}

export function triggerRedraw() {
  externalRedraw?.();
}

function redraw() {
  Render.renderScene(State.nodes, State.connections, State.zoomLevel);

  State.nodes.forEach(node => {
    DOM.syncNodeDOM(node, {
      isSelected: State.selectedNodeIds.has(node.id),
      isEditing: node.id === State.editingNodeId,
      zoomLevel: State.zoomLevel,
    });
  });

  updatePanel();
}

registerRedraw(redraw);

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

      isPointerDown = true;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      potentialDragNodeId = id;
    },

    onConnectStart(e, id) {
      e.stopPropagation();
      const node = State.getNodeById(id);
      if (!node) return;

      isDrawingConnection = true;
      connectionSource = node;
    },

    onResizeStart(e, id, direction) {
      e.stopPropagation();

      const node = State.getNodeById(id);
      if (!node) return;

      State.snapshotState();

      isResizing = true;
      resizeNodeId = id;
      resizeDir = direction;

      startX = e.clientX;
      startY = e.clientY;

      startW = node.width;
      startH = node.height;
      startNodeX = node.x;
      startNodeY = node.y;
    },
  });
}

canvas.addEventListener("mousemove", e => {

  if (isPanning) {
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;

    State.setOffset(startOffsetX + dx, startOffsetY + dy);
    redraw();
    return;
  }

  if (isPointerDown && potentialDragNodeId && !isDraggingNode) {
    const dx = e.clientX - pointerDownX;
    const dy = e.clientY - pointerDownY;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      State.snapshotState();
      isDraggingNode = true;

      dragStartPositions.clear();

      const selectedIds = State.selectedNodeIds.size
        ? State.selectedNodeIds
        : new Set([potentialDragNodeId]);

      selectedIds.forEach(id => {
        const node = State.getNodeById(id);
        if (!node) return;

        dragStartPositions.set(id, {
          x: node.x,
          y: node.y
        });
      });
    }
  }

  if (isDraggingNode) {
    const dx = (e.clientX - pointerDownX) / State.zoomLevel;
    const dy = (e.clientY - pointerDownY) / State.zoomLevel;

    dragStartPositions.forEach((startPos, id) => {
      const node = State.getNodeById(id);
      if (!node) return;

      node.x = startPos.x + dx;
      node.y = startPos.y + dy;
    });

    redraw();
    return;
  }

  if (isResizing && resizeNodeId) {
    const node = State.getNodeById(resizeNodeId);
    if (!node) return;

    const dx = (e.clientX - startX) / State.zoomLevel;
    const dy = (e.clientY - startY) / State.zoomLevel;

    const shape = ShapeRegistry[node.shape] || ShapeRegistry.rectangle;

    const ctx = {
      dx,
      dy,
      startW,
      startH,
      startNodeX,
      startNodeY,
      resizeDir
    };

    shape.applyResize?.(node, ctx);
    shape.enforceConstraints?.(node);

    redraw();
    return;
  }
});

window.addEventListener("mouseup", () => {

  if (isResizing) {
    isResizing = false;
    resizeNodeId = null;
    resizeDir = null;
    redraw();
    queueStateSync("node_update");
    return;
  }

  if (isDraggingNode) {
    isDraggingNode = false;
    potentialDragNodeId = null;
    dragStartPositions.clear();
    redraw();
    queueStateSync("node_update");
    return;
  }

  isPointerDown = false;
  potentialDragNodeId = null;
  isPanning = false;
  redraw();
});

canvas.addEventListener("mousedown", (e) => {

  if (e.button === 1 || isSpacePressed) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    startOffsetX = State.offsetX;
    startOffsetY = State.offsetY;
    return;
  }

  if (e.target !== canvas) return;

  State.clearSelection();
  redraw();
});

canvas.addEventListener("dblclick", e => {
  if (e.target !== canvas) return;

  const x = (e.clientX - State.offsetX) / State.zoomLevel;
  const y = (e.clientY - State.offsetY) / State.zoomLevel;

  State.snapshotState();
  const node = State.createNodeObject(x - 70, y - 40);
  State.addNode(node);
  attachNodeHandlers(node);
  State.selectSingleNode(node.id);
  redraw();
  queueStateSync("node_create");
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    State.setOffset(
      State.offsetX - e.deltaX,
      State.offsetY - e.deltaY
    );

    triggerRedraw();
  },
  { passive: false }
);

window.addEventListener("keydown", e => {
  if (e.key === "Delete" && State.selectedNodeIds.size > 0) {
    State.snapshotState();

    Array.from(State.selectedNodeIds).forEach(id => {
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

window.addEventListener("keyup", e => {
  if (e.code === "Space") {
    isSpacePressed = false;
    canvas.style.cursor = "default";
  }
});

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

export function initInputHandler() {}