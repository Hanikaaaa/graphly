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
});


window.addEventListener("mouseup", () => {
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
