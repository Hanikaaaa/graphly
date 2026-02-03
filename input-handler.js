import * as State from "./state.js";
import * as Render from "./renderer.js";
import * as DOM from "./dom-manager.js";
import { canvas, buttons } from "./elements.js";
import { updatePanel } from "./ui-panel.js";


let isPointerDown = false;
let pointerDownX = 0;
let pointerDownY = 0;

let potentialDragNodeId = null;
let isDraggingNode = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

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

const DRAG_THRESHOLD = 4;
let externalRedraw = null;

export function registerRedraw(fn) {
  externalRedraw = fn;
}

export function triggerRedraw() {
  externalRedraw?.();
}

function redraw() {
  Render.renderScene(State.nodes, State.zoomLevel);

  State.nodes.forEach(node => {
    DOM.syncNodeDOM(node, {
      isSelected: node.id === State.selectedNodeId,
      isEditing: node.id === State.editingNodeId,
      zoomLevel: State.zoomLevel,
    });
  });

  updatePanel();
}

registerRedraw(redraw);

export function attachNodeHandlers(node) {
  DOM.createNodeDOM(node, {
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
  if (isPointerDown && potentialDragNodeId && !isDraggingNode) {
    const dx = e.clientX - pointerDownX;
    const dy = e.clientY - pointerDownY;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      const node = State.getNodeById(potentialDragNodeId);
      if (!node) return;

      State.snapshotState();
      isDraggingNode = true;
      dragOffsetX = (pointerDownX / State.zoomLevel) - node.x;
      dragOffsetY = (pointerDownY / State.zoomLevel) - node.y;
    }
  }

  if (isDraggingNode && potentialDragNodeId) {
    const node = State.getNodeById(potentialDragNodeId);
    if (!node) return;

    node.x = (e.clientX / State.zoomLevel) - dragOffsetX;
    node.y = (e.clientY / State.zoomLevel) - dragOffsetY;
    redraw();
    return;
  }

  if (isDrawingConnection && connectionSource) {
    redraw();
    Render.drawConnectionPreview(
      connectionSource.x + connectionSource.width / 2,
      connectionSource.y + connectionSource.height / 2,
      e.clientX / State.zoomLevel,
      e.clientY / State.zoomLevel
    );
  }

  if (isResizing && resizeNodeId) {
  const node = State.getNodeById(resizeNodeId);
  if (!node) return;

  const dx = (e.clientX - startX) / State.zoomLevel;
  const dy = (e.clientY - startY) / State.zoomLevel;

  const minW = 80;
  const minH = 40;

  if (resizeDir.includes("right")) {
    node.width = Math.max(minW, startW + dx);
  }

  if (resizeDir.includes("left")) {
    const newW = Math.max(minW, startW - dx);
    node.x = startNodeX + (startW - newW);
    node.width = newW;
  }

  if (resizeDir.includes("bottom")) {
    node.height = Math.max(minH, startH + dy);
  }

  if (resizeDir.includes("top")) {
    const newH = Math.max(minH, startH - dy);
    node.y = startNodeY + (startH - newH);
    node.height = newH;
  }

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
    return;
  }

  if (isDraggingNode) {
    isDraggingNode = false;
    potentialDragNodeId = null;
    redraw();
    return;
  }

  if (isPointerDown && potentialDragNodeId) {
    State.setSelectedNodeId(potentialDragNodeId);
  }

  isPointerDown = false;
  potentialDragNodeId = null;
  redraw();
});

canvas.addEventListener("mouseup", e => {
  if (!isDrawingConnection || !connectionSource) return;

  State.snapshotState();

  const newNode = State.createNodeObject(
    e.clientX / State.zoomLevel,
    e.clientY / State.zoomLevel
  );

  State.addNode(newNode);
  State.addConnection(connectionSource.id, newNode.id);
  attachNodeHandlers(newNode);

  isDrawingConnection = false;
  connectionSource = null;
  redraw();
});


canvas.addEventListener("click", e => {
  if (e.target !== canvas) return;
  State.clearSelection();
  redraw();
});


window.addEventListener("keydown", e => {
  if (e.key === "Delete" && State.selectedNodeId) {
    State.deleteNodeLogic(State.selectedNodeId, e.shiftKey);
    redraw();
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

export function initInputHandler() {
  // listeners attached at load
}
