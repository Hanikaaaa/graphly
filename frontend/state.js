export let nodes = [];
export let connections = []; 
export let selectedNodeId = null;
export let selectedConnectionId = null;
export let editingNodeId = null;
export let zoomLevel = 1;
export let offsetX = 0;
export let offsetY = 0;

export const DEFAULT_BACKGROUND = Object.freeze({
  type: "grid",

  // base
  color: "#fafafa",

  // grid
  gridColor: "#e6e6e6",
  gridSpacing: 40,
  gridLineWidth: 1,
  gridOpacity: 1,

  // dots
  dotColor: "#d0d0d0",
  dotSpacing: 40,
  dotRadius: 1.5,
  dotOpacity: 1,

  parallaxStrength: 0, // 0 = fixed, >0 = slow movement
});

function cloneDefaultBackground() {
  return structuredClone(DEFAULT_BACKGROUND);
}

export let background = cloneDefaultBackground();

let undoStack = [];
let redoStack = [];

function generateId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneState() {
  return structuredClone({
    nodes,
    connections,
    selectedNodeId,
    selectedConnectionId,
    editingNodeId,
    zoomLevel,
    offsetX,
    offsetY,
    background,
  });
}

function restoreState(snapshot) {
  nodes = snapshot.nodes;
  connections = snapshot.connections;
  zoomLevel = snapshot.zoomLevel;
  offsetX = snapshot.offsetX;
  offsetY = snapshot.offsetY;
  background = {
    ...cloneDefaultBackground(),
    ...(snapshot.background || {}),
  };

  selectedNodeId = nodes.some(n => n.id === snapshot.selectedNodeId)
    ? snapshot.selectedNodeId
    : null;
  selectedConnectionId = nodes.some(n => n.id === snapshot.selectedConnectionId)
    ? snapshot.selectedConnectionId
    : null;

  editingNodeId = nodes.some(n => n.id === snapshot.editingNodeId)
    ? snapshot.editingNodeId
    : null;
}

// Undo - Redo
export function snapshotState() {
  undoStack.push(cloneState());
  redoStack = [];
}

export function undo() {
  const snapshot = undoStack.pop();
  if (!snapshot) return false;

  redoStack.push(cloneState());
  restoreState(snapshot);
  return true;
}

export function redo() {
  const snapshot = redoStack.pop();
  if (!snapshot) return false;

  undoStack.push(cloneState());
  restoreState(snapshot);
  return true;
}

export function setOffset(x, y) {
  offsetX = x;
  offsetY = y;
}

export function createNodeObject(x, y) {
  return {
    id: generateId(),
    x,
    y,
    width: 140,
    height: 140,

    // content
    text: "",
    //image
    image: null,        
    imageFit: "cover", 

    // text styles
    textAlign: "left",
    fontWeight: "normal",
    fontSize: 14,
    fontColor: "#000",
    fontFamily: "Arial",

    // box styles
    color: "#ffffff",
    borderColor: "#bc7c7c",
    borderStyle: "solid",
    borderRadius: 16,
    opacity: 1,

    // shape
    shape: "rectangle",

    // connections (ID-based)
    connectorColor: "#444",
    connectorWidth: 3,
    connections: [], 
  };
}

// Selectors

export function getNodeById(id) {
  return nodes.find(n => n.id === id) || null;
}

export function getSelectedNode() {
  return selectedNodeId
    ? nodes.find(n => n.id === selectedNodeId) || null
    : null;
}

export function addNode(node) {
  nodes.push(node);
}

export function setSelectedNodeId(id) {
  selectedNodeId = getNodeById(id) ? id : null;
  selectedConnectionId = null;
  editingNodeId = null;
}

export function setSelectedConnectionId(id) {
  console.log("[setSelectedConnectionId] called with", id);

  selectedConnectionId = connections.some(c => c.id === id) ? id : null;
  selectedNodeId = null;
  editingNodeId = null;

  console.log("[setSelectedConnectionId] final =", selectedConnectionId);
}



export function setEditingNodeId(id) {
  editingNodeId = getNodeById(id) ? id : null;
}

export function setZoomLevel(val) {
  zoomLevel = val;
}


export function addConnection(fromId, toId) {
  if (fromId === toId) return;

  const from = getNodeById(fromId);
  const to = getNodeById(toId);
  if (!from || !to) return;

  if (!connections.some(c => c.from === fromId && c.to === toId)) {
    connections.push({
      id: generateId(),
      from: fromId,
      to: toId,
      color: from.connectorColor || "#444",
      width: from.connectorWidth || 3,
      style: "solid",         
    });
  }
}

export function deleteNodeLogic(rootId, cascade = false) {
  const root = getNodeById(rootId);
  if (!root) return new Set();

  snapshotState();

  const toDelete = new Set();

  if (cascade) {
    // DFS over connection graph
    const dfs = (id) => {
      if (toDelete.has(id)) return;
      toDelete.add(id);

      connections.forEach(c => {
        if (c.from === id) {
          dfs(c.to);
        }
      });
    };

    dfs(rootId);
  } else {
    toDelete.add(rootId);
  }

  // remove nodes
  nodes = nodes.filter(n => !toDelete.has(n.id));

  // remove connections touching deleted nodes
  connections = connections.filter(
    c => !toDelete.has(c.from) && !toDelete.has(c.to)
  );

  // clear selection / editing if needed
  if (toDelete.has(selectedNodeId)) selectedNodeId = null;
  if (toDelete.has(editingNodeId)) editingNodeId = null;

  return toDelete;
}

export function clearSelection() {
  selectedNodeId = null;
  selectedConnectionId = null;
  editingNodeId = null;
}

export function resetCanvasState() {
  nodes = [];
  connections = [];
  selectedNodeId = null;
  selectedConnectionId = null;
  editingNodeId = null;
  zoomLevel = 1;
  offsetX = 0;
  offsetY = 0;
  background = cloneDefaultBackground();
  undoStack = [];
  redoStack = [];
}

export function exportCollabState() {
  return structuredClone({
    nodes,
    connections,
    zoomLevel,
    offsetX,
    offsetY,
    background,
  });
}

export function importCollabState(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.connections)) {
    return false;
  }

  nodes = structuredClone(snapshot.nodes);
  connections = structuredClone(snapshot.connections);
  background = {
    ...cloneDefaultBackground(),
    ...(snapshot.background || {}),
  };
  zoomLevel = typeof snapshot.zoomLevel === "number" ? snapshot.zoomLevel : zoomLevel;
  offsetX = typeof snapshot.offsetX === "number" ? snapshot.offsetX : 0;
  offsetY = typeof snapshot.offsetY === "number" ? snapshot.offsetY : 0;

  selectedNodeId = null;
  selectedConnectionId = null;
  editingNodeId = null;

  return true;
}
