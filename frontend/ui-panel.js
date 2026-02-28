import * as State from "./state.js";
import { inputs, buttons, panel } from "./elements.js";
import { triggerRedraw } from "./input-handler.js";
import { rebuild } from "./main.js";
import { queueStateSync } from "./collaboration.js";
import { ShapeRegistry } from "./shapes.js";

panel.addEventListener("mousedown", (e) => e.stopPropagation());
panel.addEventListener("click", (e) => e.stopPropagation());

function getSelectedNodes() {
  return Array.from(State.selectedNodeIds)
    .map((id) => State.getNodeById(id))
    .filter(Boolean);
}

function getSingleSelectedNode() {
  const nodes = getSelectedNodes();
  return nodes.length === 1 ? nodes[0] : null;
}

function mutateSelection(fn) {
  const nodes = getSelectedNodes();
  if (!nodes.length) return;

  State.snapshotState();
  nodes.forEach(fn);

  triggerRedraw();
  queueStateSync("node_update");
}

export function updatePanel() {
  const selectedNodes = getSelectedNodes();
  const node = getSingleSelectedNode();
  const connectionId = State.getPrimarySelectedConnectionId();

  // Always sync background controls
  inputs.bgType.value = State.background.type;
  inputs.bgCanvasColor.value = State.background.color;
  inputs.bgGridColor.value = State.background.gridColor;
  inputs.bgDotColor.value = State.background.dotColor;
  inputs.bgGridSpacing.value = State.background.gridSpacing;
  inputs.bgGridWidth.value = State.background.gridLineWidth;
  inputs.bgGridOpacity.value = State.background.gridOpacity;
  inputs.bgDotSpacing.value = State.background.dotSpacing;
  inputs.bgDotRadius.value = State.background.dotRadius;
  inputs.bgDotOpacity.value = State.background.dotOpacity;

  // Nothing selected
  if (!selectedNodes.length && !connectionId) {
    panel.classList.add("hidden");
    document.body.classList.remove("panel-open");
    return;
  }

  panel.classList.remove("hidden");
  document.body.classList.add("panel-open");

  // Connection Mode
  if (connectionId) {
    const conn = State.connections.find((c) => c.id === connectionId);
    if (!conn) return;

    buttons.removeImage.classList.add("hidden");

    inputs.connectorColor.value = conn.color;
    inputs.connectorWidth.value = conn.width;
    inputs.connectorStyle.value = conn.style;

    return;
  }

  // Node Mode

  if (node) {
    inputs.bgColor.value = node.color;
    inputs.borderColor.value = node.borderColor;
    inputs.opacity.value = node.opacity;
    inputs.borderRadius.value = node.borderRadius;
    inputs.nodeShape.value = node.shape;

    inputs.textColor.value = node.fontColor;
    inputs.fontSize.value = node.fontSize;
    inputs.textAlign.value = node.textAlign;
    inputs.fontWeight.value = node.fontWeight;
    inputs.fontFamily.value = node.fontFamily;

    inputs.connectorColor.value = node.connectorColor;
    inputs.connectorWidth.value = node.connectorWidth;

    buttons.removeImage.classList.toggle("hidden", !node.image);
  } else {
    buttons.removeImage.classList.add("hidden");
  }
}

// Node Priority Controls

inputs.bgColor.oninput = () =>
  mutateSelection((n) => (n.color = inputs.bgColor.value));

inputs.borderColor.oninput = () =>
  mutateSelection((n) => (n.borderColor = inputs.borderColor.value));

inputs.opacity.oninput = () =>
  mutateSelection((n) => (n.opacity = Number(inputs.opacity.value)));

inputs.borderRadius.oninput = () =>
  mutateSelection((n) => (n.borderRadius = Number(inputs.borderRadius.value)));

inputs.textColor.oninput = () =>
  mutateSelection((n) => (n.fontColor = inputs.textColor.value));

inputs.fontSize.oninput = () =>
  mutateSelection((n) => (n.fontSize = Number(inputs.fontSize.value)));

inputs.textAlign.onchange = () =>
  mutateSelection((n) => (n.textAlign = inputs.textAlign.value));

inputs.fontWeight.onchange = () =>
  mutateSelection((n) => (n.fontWeight = inputs.fontWeight.value));

inputs.fontFamily.onchange = () =>
  mutateSelection((n) => (n.fontFamily = inputs.fontFamily.value));

inputs.nodeShape.onchange = () =>
  mutateSelection((n) => {
    n.shape = inputs.nodeShape.value;
    const shape = ShapeRegistry[n.shape];
    shape?.enforceConstraints?.(n);
  });

inputs.connectorColor.oninput = () => {
  const connId = State.getPrimarySelectedConnectionId();

  if (connId) {
    State.snapshotState();
    const conn = State.connections.find((c) => c.id === connId);
    if (conn) conn.color = inputs.connectorColor.value;
    triggerRedraw();
    queueStateSync("node_update");
    return;
  }

  mutateSelection((n) => (n.connectorColor = inputs.connectorColor.value));
};

inputs.connectorWidth.oninput = () => {
  const connId = State.getPrimarySelectedConnectionId();

  if (connId) {
    State.snapshotState();
    const conn = State.connections.find((c) => c.id === connId);
    if (conn) conn.width = Number(inputs.connectorWidth.value);
    triggerRedraw();
    queueStateSync("node_update");
    return;
  }

  mutateSelection(
    (n) => (n.connectorWidth = Number(inputs.connectorWidth.value)),
  );
};

inputs.connectorStyle.onchange = () => {
  const connId = State.getPrimarySelectedConnectionId();
  if (!connId) return;

  State.snapshotState();
  const conn = State.connections.find((c) => c.id === connId);
  if (conn) conn.style = inputs.connectorStyle.value;

  triggerRedraw();
  queueStateSync("node_update");
};

inputs.nodeImageInput.onchange = () => {
  const node = getSingleSelectedNode();
  if (!node) return;

  const file = inputs.nodeImageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    State.snapshotState();
    node.image = reader.result;
    triggerRedraw();
    queueStateSync("node_update");
    inputs.nodeImageInput.value = "";
  };

  reader.readAsDataURL(file);
};

buttons.removeImage.onclick = () => {
  mutateSelection((n) => (n.image = null));
};

// Background Controls

inputs.bgType.onchange = () => {
  State.snapshotState();
  State.background.type = inputs.bgType.value;
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgCanvasColor.oninput = () => {
  State.snapshotState();
  State.background.color = inputs.bgCanvasColor.value;
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgGridColor.oninput = () => {
  State.snapshotState();
  State.background.gridColor = inputs.bgGridColor.value;
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgDotColor.oninput = () => {
  State.snapshotState();
  State.background.dotColor = inputs.bgDotColor.value;
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgGridSpacing.oninput = () => {
  State.snapshotState();
  State.background.gridSpacing = Number(inputs.bgGridSpacing.value);
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgGridWidth.oninput = () => {
  State.snapshotState();
  State.background.gridLineWidth = Number(inputs.bgGridWidth.value);
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgGridOpacity.oninput = () => {
  State.snapshotState();
  State.background.gridOpacity = Number(inputs.bgGridOpacity.value);
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgDotSpacing.oninput = () => {
  State.snapshotState();
  State.background.dotSpacing = Number(inputs.bgDotSpacing.value);
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgDotRadius.oninput = () => {
  State.snapshotState();
  State.background.dotRadius = Number(inputs.bgDotRadius.value);
  triggerRedraw();
  queueStateSync("background_update");
};

inputs.bgDotOpacity.oninput = () => {
  State.snapshotState();
  State.background.dotOpacity = Number(inputs.bgDotOpacity.value);
  triggerRedraw();
  queueStateSync("background_update");
};

// Delete

buttons.deleteNode.onclick = () => {
  if (!State.selectedNodeIds.size) return;

  State.snapshotState();

  Array.from(State.selectedNodeIds).forEach((id) => {
    State.deleteNodeLogic(id, false);
  });

  State.clearSelection();
  rebuild();
  queueStateSync("node_delete");
};

buttons.deleteSubtree.onclick = () => {
  if (!State.selectedNodeIds.size) return;

  State.snapshotState();

  Array.from(State.selectedNodeIds).forEach((id) => {
    State.deleteNodeLogic(id, true);
  });

  State.clearSelection();
  rebuild();
  queueStateSync("node_delete");
};
