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

let isSpacePressed = false;

const DRAG_THRESHOLD = 4;
let externalRedraw = null;

let interaction = {
  mode: "idle",   // idle | dragPending | drag | resize | groupDrag | groupResize | pan | marquee | connect

  startX: 0,
  startY: 0,

  nodeId: null,
  resizeDir: null,

  startW: 0,
  startH: 0,
  startNodeX: 0,
  startNodeY: 0,

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

function redraw() {

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
    connectionPreview
  );

  State.nodes.forEach(node => {
    DOM.syncNodeDOM(node, {
      isSelected: State.selectedNodeIds.has(node.id),
      isEditing: node.id === State.editingNodeId,
      zoomLevel: State.zoomLevel,
    });
  });

  updateGroupOverlay(State.zoomLevel);

  updatePanel();
}

registerRedraw(redraw);

document.addEventListener("mousedown", (e) => {

  const overlay = getGroupOverlay();
  if (!overlay) return;

  const handle = e.target.closest(".group-handle");
  if (!handle) return;

  e.stopPropagation();

  const dir = handle.dataset.dir;

  const bounds = getSelectionBounds();
  if (!bounds) return;

  interaction.mode = "groupResize";
  interaction.groupResizeHandle = dir;
  interaction.groupBounds = bounds;

  interaction.startX = e.clientX;
  interaction.startY = e.clientY;

  interaction.groupInitialNodes.clear();

  State.selectedNodeIds.forEach(id => {
    const n = State.getNodeById(id);
    interaction.groupInitialNodes.set(id, {
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height
    });
  });

  State.snapshotState();
});

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

      interaction.startX = e.clientX;
      interaction.startY = e.clientY;

      interaction.startW = node.width;
      interaction.startH = node.height;
      interaction.startNodeX = node.x;
      interaction.startNodeY = node.y;
    },
  });
}

function getSelectionBounds() {
  if (State.selectedNodeIds.size <= 1) return null;

  const selectedNodes = State.nodes.filter(n =>
    State.selectedNodeIds.has(n.id)
  );

  const minX = Math.min(...selectedNodes.map(n => n.x));
  const minY = Math.min(...selectedNodes.map(n => n.y));
  const maxX = Math.max(...selectedNodes.map(n => n.x + n.width));
  const maxY = Math.max(...selectedNodes.map(n => n.y + n.height));

  return { minX, minY, maxX, maxY };
}

canvas.addEventListener("mousemove", e => {

  // PAN
  if (interaction.mode === "pan") {
    const dx = e.clientX - interaction.panStartX;
    const dy = e.clientY - interaction.panStartY;

    State.setOffset(
      interaction.startOffsetX + dx,
      interaction.startOffsetY + dy
    );
    redraw();
    return;
  }

  if (interaction.mode === "groupResize") {

  const dx =
    (e.clientX - interaction.startX) / State.zoomLevel;

  const dy =
    (e.clientY - interaction.startY) / State.zoomLevel;

  const original = interaction.groupBounds;

  let newWidth = original.maxX - original.minX;
  let newHeight = original.maxY - original.minY;

  // Only implement bottom-right cleanly first
  if (interaction.groupResizeHandle === "br") {
    newWidth += dx;
    newHeight += dy;
  }

  if (newWidth < 20) newWidth = 20;
  if (newHeight < 20) newHeight = 20;

  const scaleX = newWidth / (original.maxX - original.minX);
  const scaleY = newHeight / (original.maxY - original.minY);

  interaction.groupInitialNodes.forEach((init, id) => {

    const node = State.getNodeById(id);
    if (!node) return;

    node.x =
      original.minX + (init.x - original.minX) * scaleX;

    node.y =
      original.minY + (init.y - original.minY) * scaleY;

    node.width = init.width * scaleX;
    node.height = init.height * scaleY;
  });

  redraw();
  return;
}

  if (interaction.mode === "groupDrag") {

  const dx = (e.clientX - interaction.startX) / State.zoomLevel;
  const dy = (e.clientY - interaction.startY) / State.zoomLevel;

  interaction.dragStartPositions.forEach((startPos, id) => {
    const node = State.getNodeById(id);
    if (!node) return;

    node.x = startPos.x + dx;
    node.y = startPos.y + dy;
  });

  redraw();
  return;
}

  // DRAG START THRESHOLD
  if (interaction.mode === "dragPending") {
    const dx = e.clientX - interaction.startX;
    const dy = e.clientY - interaction.startY;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      interaction.mode = "drag";
      State.snapshotState();

      interaction.dragStartPositions.clear();

      const selected = State.selectedNodeIds.size
        ? State.selectedNodeIds
        : new Set([interaction.nodeId]);

      selected.forEach(id => {
        const n = State.getNodeById(id);
        if (!n) return;

        interaction.dragStartPositions.set(id, {
          x: n.x,
          y: n.y
        });
      });
    }
  }

  // DRAGGING
  if (interaction.mode === "drag") {
    const dx = (e.clientX - interaction.startX) / State.zoomLevel;
    const dy = (e.clientY - interaction.startY) / State.zoomLevel;

    interaction.dragStartPositions.forEach((startPos, id) => {
      const node = State.getNodeById(id);
      if (!node) return;

      node.x = startPos.x + dx;
      node.y = startPos.y + dy;
    });

    redraw();
    return;
  }

  // RESIZE
  if (interaction.mode === "resize") {
    const node = State.getNodeById(interaction.nodeId);
    if (!node) return;

    const dx = (e.clientX - interaction.startX) / State.zoomLevel;
    const dy = (e.clientY - interaction.startY) / State.zoomLevel;

    const shape = ShapeRegistry[node.shape] || ShapeRegistry.rectangle;

    const ctx = {
      dx,
      dy,
      startW: interaction.startW,
      startH: interaction.startH,
      startNodeX: interaction.startNodeX,
      startNodeY: interaction.startNodeY,
      resizeDir: interaction.resizeDir
    };

    shape.applyResize?.(node, ctx);
    shape.enforceConstraints?.(node);

    redraw();
    return;
  }

  // CONNECT MODE
  if (interaction.mode === "connect") {

    interaction.connectionCurrentX = e.clientX;
    interaction.connectionCurrentY = e.clientY;

    redraw();
    return;
  }

  // MARQUEE
  if (interaction.mode === "marquee") {

    interaction.marqueeCurrentX = e.clientX;
    interaction.marqueeCurrentY = e.clientY;

    const startX =
      (interaction.marqueeStartX - State.offsetX) / State.zoomLevel;
    const startY =
      (interaction.marqueeStartY - State.offsetY) / State.zoomLevel;

    const currentX =
      (interaction.marqueeCurrentX - State.offsetX) / State.zoomLevel;
    const currentY =
      (interaction.marqueeCurrentY - State.offsetY) / State.zoomLevel;

    const minX = Math.min(startX, currentX);
    const maxX = Math.max(startX, currentX);
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);

    State.clearSelection();

    State.nodes.forEach(node => {
      const intersects =
        node.x < maxX &&
        node.x + node.width > minX &&
        node.y < maxY &&
        node.y + node.height > minY;

      if (intersects) {
        State.selectedNodeIds.add(node.id);
      }
    });

    redraw();
    return;
  }
});

window.addEventListener("mouseup", () => {

  if (interaction.mode === "connect") {

  const sourceId = interaction.connectionSourceId;

  const worldX =
    (interaction.connectionCurrentX - State.offsetX) / State.zoomLevel;

  const worldY =
    (interaction.connectionCurrentY - State.offsetY) / State.zoomLevel;

  let targetNode = null;

  State.nodes.forEach(node => {
    const inside =
      worldX >= node.x &&
      worldX <= node.x + node.width &&
      worldY >= node.y &&
      worldY <= node.y + node.height;

    if (inside) {
      targetNode = node;
    }
  });

  State.snapshotState();

  if (targetNode && targetNode.id !== sourceId) {

    // Connect to existing node
    State.addConnection(sourceId, targetNode.id);

  } else {

    // 🔥 Create new node at drop location
    const newNode = State.createNodeObject(
      worldX - 70,
      worldY - 40
    );

    State.addNode(newNode);
    attachNodeHandlers(newNode);

    // Connect source → new node
    State.addConnection(sourceId, newNode.id);
  }

  queueStateSync("node_update");
}

  if (interaction.mode === "groupDrag") {
    queueStateSync("node_update");
  }

  if (interaction.mode === "groupResize") {

  const dx =
    (e.clientX - interaction.startX) / State.zoomLevel;

  const dy =
    (e.clientY - interaction.startY) / State.zoomLevel;

  const original = interaction.groupBounds;

  let newMinX = original.minX;
  let newMinY = original.minY;
  let newMaxX = original.maxX;
  let newMaxY = original.maxY;

  switch (interaction.groupResizeHandle) {

    case "br":
      newMaxX += dx;
      newMaxY += dy;
      break;

    case "tr":
      newMaxX += dx;
      newMinY += dy;
      break;

    case "bl":
      newMinX += dx;
      newMaxY += dy;
      break;

    case "tl":
      newMinX += dx;
      newMinY += dy;
      break;
  }

  const originalWidth = original.maxX - original.minX;
  const originalHeight = original.maxY - original.minY;

  const newWidth = newMaxX - newMinX;
  const newHeight = newMaxY - newMinY;

  if (newWidth < 20 || newHeight < 20) return;

  const scaleX = newWidth / originalWidth;
  const scaleY = newHeight / originalHeight;

  interaction.groupInitialNodes.forEach((init, id) => {

    const node = State.getNodeById(id);
    if (!node) return;

    node.x =
      newMinX + (init.x - original.minX) * scaleX;

    node.y =
      newMinY + (init.y - original.minY) * scaleY;

    node.width = init.width * scaleX;
    node.height = init.height * scaleY;
  });

  redraw();
  return;
}

  // CRITICAL RESET
  interaction.mode = "idle";
  interaction.nodeId = null;
  interaction.connectionSourceId = null;
  interaction.dragStartPositions.clear();

  redraw();
});

canvas.addEventListener("mousedown", (e) => {

  // PAN
  if (e.button === 1 || isSpacePressed) {
    interaction.mode = "pan";
    interaction.panStartX = e.clientX;
    interaction.panStartY = e.clientY;
    interaction.startOffsetX = State.offsetX;
    interaction.startOffsetY = State.offsetY;
    return;
  }

  const bounds = getSelectionBounds();

  if (bounds) {

    const worldX =
      (e.clientX - State.offsetX) / State.zoomLevel;

    const worldY =
      (e.clientY - State.offsetY) / State.zoomLevel;

    const handleSize = 10 / State.zoomLevel;

    const handles = {
      br: { x: bounds.maxX, y: bounds.maxY },
      bl: { x: bounds.minX, y: bounds.maxY },
      tr: { x: bounds.maxX, y: bounds.minY },
      tl: { x: bounds.minX, y: bounds.minY }
    };

    // 🔴 CHECK RESIZE HANDLES FIRST
    for (const key in handles) {
      const h = handles[key];

      const hit =
        worldX >= h.x - handleSize &&
        worldX <= h.x + handleSize &&
        worldY >= h.y - handleSize &&
        worldY <= h.y + handleSize;

      if (hit) {

        interaction.mode = "groupResize";
        interaction.groupResizeHandle = key;
        interaction.groupBounds = bounds;

        interaction.startX = e.clientX;
        interaction.startY = e.clientY;

        interaction.groupInitialNodes.clear();

        State.selectedNodeIds.forEach(id => {
          const n = State.getNodeById(id);
          interaction.groupInitialNodes.set(id, {
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height
          });
        });

        State.snapshotState();
        return;
      }
    }

    // 🔵 THEN CHECK GROUP DRAG
    const inside =
      worldX >= bounds.minX &&
      worldX <= bounds.maxX &&
      worldY >= bounds.minY &&
      worldY <= bounds.maxY;

    if (inside) {

      interaction.mode = "groupDrag";
      interaction.startX = e.clientX;
      interaction.startY = e.clientY;

      interaction.dragStartPositions.clear();

      State.selectedNodeIds.forEach(id => {
        const node = State.getNodeById(id);
        interaction.dragStartPositions.set(id, {
          x: node.x,
          y: node.y
        });
      });

      return;
    }
  }

  // MARQUEE
  interaction.mode = "marquee";
  interaction.marqueeStartX = e.clientX;
  interaction.marqueeStartY = e.clientY;
  interaction.marqueeCurrentX = e.clientX;
  interaction.marqueeCurrentY = e.clientY;

  State.clearSelection();
  redraw();
});

canvas.addEventListener("dblclick", e => {
  console.log("DOUBLE CLICK FIRED");
});

window.addEventListener("dblclick", e => {

  // Ignore if double-clicking inside a node
  if (e.target.closest(".node-input")) return;

  const rect = canvas.getBoundingClientRect();

  const x =
    (e.clientX - rect.left - State.offsetX) / State.zoomLevel;

  const y =
    (e.clientY - rect.top - State.offsetY) / State.zoomLevel;

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