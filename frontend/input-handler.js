import * as State from "./state.js";
import * as Render from "./renderer.js";
import * as DOM from "./dom-manager.js";
import { canvas, buttons } from "./elements.js";
import { updatePanel } from "./ui-panel.js";
import { rebuild } from "./main.js";
import { queueStateSync } from "./collaboration.js";


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
      isSelected: node.id === State.selectedNodeId,
      isEditing: node.id === State.editingNodeId,
      zoomLevel: State.zoomLevel,
    });
  });

  updatePanel();
}

registerRedraw(redraw);

function findConnectionAt(x, y) {
  const threshold = 20 / State.zoomLevel;
  console.log("[findConnectionAt] click at", x, y);

  for (const c of State.connections) {
    const from = State.getNodeById(c.from);
    const to = State.getNodeById(c.to);
    if (!from || !to) continue;

    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height / 2;
    const x2 = to.x + to.width / 2;
    const y2 = to.y + to.height / 2;
    const cy = (y1 + y2) / 2; // SAME control point as renderer

    // sample the curve
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      const bx =
        (1 - t) * (1 - t) * x1 +
        2 * (1 - t) * t * x1 +
        t * t * x2;

      const by =
        (1 - t) * (1 - t) * y1 +
        2 * (1 - t) * t * cy +
        t * t * y2;

      const d = Math.hypot(x - bx, y - by);
      if (d <= threshold) {
        console.log("[HIT connection]", c.id);
        return c;
      }
    }
  }

  console.log("[NO connection hit]");
  return null;
}


function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = len_sq !== 0 ? dot / len_sq : -1;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

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

    State.setOffset(
      startOffsetX + dx,
      startOffsetY + dy
    );

     redraw();
     return;
  }

  if (isPointerDown && potentialDragNodeId && !isDraggingNode) {
    const dx = e.clientX - pointerDownX;
    const dy = e.clientY - pointerDownY;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      const node = State.getNodeById(potentialDragNodeId);
      if (!node) return;

      State.snapshotState();
      isDraggingNode = true;
      dragOffsetX = ((pointerDownX - State.offsetX) / State.zoomLevel) - node.x;
      dragOffsetY = ((pointerDownY - State.offsetY) / State.zoomLevel) - node.y;
    }
  }

  if (isDraggingNode && potentialDragNodeId) {
    const node = State.getNodeById(potentialDragNodeId);
    if (!node) return;

    node.x = ((e.clientX - State.offsetX)/ State.zoomLevel) - dragOffsetX;
    node.y = ((e.clientY - State.offsetY) / State.zoomLevel) - dragOffsetY;
    redraw();
    return;
  }

  if (isDrawingConnection && connectionSource) {
    redraw();
    Render.drawConnectionPreview(
      connectionSource.x + connectionSource.width / 2,
      connectionSource.y + connectionSource.height / 2,
      (e.clientX - State.offsetX) / State.zoomLevel,
      (e.clientY - State.offsetY) / State.zoomLevel
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
    queueStateSync("node_update");
    return;
  }

  if (isDraggingNode) {
    isDraggingNode = false;
    potentialDragNodeId = null;
    redraw();
    queueStateSync("node_update");
    return;
  }

  if (isPointerDown && potentialDragNodeId && !isDraggingNode && !State.selectedConnectionId) {
  State.setSelectedNodeId(potentialDragNodeId);
  }


  isPointerDown = false;
  potentialDragNodeId = null;
  isPanning = false;
  redraw();
});
canvas.addEventListener("mousedown", (e) => {
  console.log("[canvas click]", e.target);

  if (State.selectedConnectionId) {
    console.log("[canvas] connection already selected, not clearing");
    return;
  }
  if (e.button === 1) { // middle mouse
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    startOffsetX = State.offsetX;
    startOffsetY = State.offsetY;
    return;
  }

  if (isSpacePressed) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    startOffsetX = State.offsetX;
    startOffsetY = State.offsetY;
    return;
  }

  State.clearSelection();
  console.log("[cleared selection]");
});

canvas.addEventListener("mouseup", e => {
  if (!isDrawingConnection || !connectionSource) return;

  const x = (e.clientX - State.offsetX) / State.zoomLevel;
  const y = (e.clientY - State.offsetY) / State.zoomLevel;
  const sourceNode = connectionSource;

  State.snapshotState();

  const node = State.createNodeObject(x, y);
  State.addNode(node);
  State.addConnection(sourceNode.id, node.id);
  attachNodeHandlers(node);


  isDrawingConnection = false;
  connectionSource = null;
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

canvas.addEventListener("click", e => {
  if (e.target !== canvas) return;

  const x = (e.clientX - State.offsetX) / State.zoomLevel;
  const y = (e.clientY - State.offsetY) / State.zoomLevel;

  if (State.nodes.length === 0) {
    State.snapshotState();
    const node = State.createNodeObject(x - 70, y - 40);
    State.addNode(node);
    attachNodeHandlers(node);
    State.setSelectedNodeId(node.id);
    redraw();
    queueStateSync("node_create");
    return;
  }

  const hit = findConnectionAt(x, y);

  console.log("[canvas click]", { x, y, hit });

  if (hit) {
    console.log("[before] selectedConnectionId =", State.selectedConnectionId);
    State.setSelectedConnectionId(hit.id);
    console.log("[after] selectedConnectionId =", State.selectedConnectionId);
  } else {
    State.clearSelection();
    console.log("[cleared selection]");
  }

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
  State.setSelectedNodeId(node.id);
  redraw();
  queueStateSync("node_create");
});


window.addEventListener("keydown", e => {
  if (e.key === "Delete" && State.selectedNodeId) {
    State.deleteNodeLogic(State.selectedNodeId, e.shiftKey);
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

export function initInputHandler() {
  // listeners attached at load
}
