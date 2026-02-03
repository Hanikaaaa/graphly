export let nodes = [];
export let selectedNodeId = null;
export let editingNodeId = null;
export let zoomLevel = 1;

let undoStack = [];
let redoStack = [];

function cloneState() {
  return structuredClone({
    nodes,
    selectedNodeId,
    editingNodeId,
    zoomLevel,
  });
}

function restoreState(snapshot) {
  nodes = snapshot.nodes;
  zoomLevel = snapshot.zoomLevel;

  selectedNodeId = nodes.some(n => n.id === snapshot.selectedNodeId)
    ? snapshot.selectedNodeId
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
  if (undoStack.length === 0) return false;

  redoStack.push(cloneState());
  restoreState(undoStack.pop());
  return true;
}

export function redo() {
  if (redoStack.length === 0) return false;

  undoStack.push(cloneState());
  restoreState(redoStack.pop());
  return true;
}


export function createNodeObject(x, y) {
  return {
    id: crypto.randomUUID(),
    x,
    y,
    width: 140,
    height: 80,

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
  snapshotState();
  nodes.push(node);
}

export function setSelectedNodeId(id) {
  selectedNodeId = getNodeById(id) ? id : null;
}


export function setEditingNodeId(id) {
  editingNodeId = getNodeById(id) ? id : null;
}

export function setZoomLevel(val) {
  zoomLevel = val;
}


export function addConnection(fromId, toId) {
  const from = getNodeById(fromId);
  const to = getNodeById(toId);
  if (!from || !to) return;

  snapshotState();

  if (!from.connections.includes(toId)) {
    from.connections.push(toId);
  }
}

export function deleteNodeLogic(rootId, cascade = false) {
  const root = getNodeById(rootId);
  console.log("DELETE CALLED WITH:", rootId);
  if (!root) return new Set();

  snapshotState();

  const toDelete = new Set();

  if (cascade) {
    const dfs = (id) => {
      if (toDelete.has(id)) return;
      toDelete.add(id);

      const node = getNodeById(id);
      if (!node) return;

      node.connections.forEach(childId => dfs(childId));
    };
    dfs(rootId);
  } else {
    toDelete.add(rootId);
  }

  // remove nodes
  nodes = nodes.filter(n => !toDelete.has(n.id));

  // remove incoming connections
  nodes.forEach(n => {
    n.connections = n.connections.filter(id => !toDelete.has(id));
  });

  // clear selection / editing if needed
  if (toDelete.has(selectedNodeId)) selectedNodeId = null;
  if (toDelete.has(editingNodeId)) editingNodeId = null;
  console.log("Remaining nodes:", nodes.map(n => n.id));
  return toDelete; // caller decides how to update DOM
}

export function clearSelection() {
  selectedNodeId = null;
  editingNodeId = null;
}
