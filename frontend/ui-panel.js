import * as State from "./state.js";
import { inputs, buttons, panel } from "./elements.js";
import { triggerRedraw } from "./input-handler.js";
import { rebuild } from "./main.js";
import { queueStateSync } from "./collaboration.js";

panel.addEventListener("mousedown", e => e.stopPropagation());
panel.addEventListener("click", e => e.stopPropagation());

function getSelectedNode() {
  return State.getNodeById(State.selectedNodeId);
}

function mutateNode(fn) {
  const node = getSelectedNode();
  if (!node) return;
  State.snapshotState();
  fn(node);
  triggerRedraw();
  queueStateSync("node_update");
}

export function updatePanel() {
  const node = State.getNodeById(State.selectedNodeId);
  const conn = State.connections.find(c => c.id === State.selectedConnectionId);
  inputs.bgType.value = State.background.type;
  inputs.bgCanvasColor.value = State.background.color;
  inputs.bgGridColor.value = State.background.gridColor;
  inputs.bgDotColor.value = State.background.dotColor;
  if (!node && !conn) {
  panel.classList.add("hidden");
  document.body.classList.remove("panel-open");
  return;
  }

  panel.classList.remove("hidden");
  document.body.classList.add("panel-open");


  if (node) {
    // Node properties (your current code)
    inputs.bgColor.value = node.color;
    inputs.borderColor.value = node.borderColor;
    inputs.opacity.value = node.opacity;
    inputs.borderRadius.value = node.borderRadius;

    inputs.textColor.value = node.fontColor;
    inputs.fontSize.value = node.fontSize;
    inputs.textAlign.value = node.textAlign;
    inputs.fontWeight.value = node.fontWeight;
    inputs.fontFamily.value = node.fontFamily;

    inputs.connectorColor.value = node.connectorColor;
    inputs.connectorWidth.value = node.connectorWidth;

    buttons.removeImage.classList.toggle("hidden", !node.image);
  } else if (conn) {
    // Connection properties
    inputs.connectorColor.value = conn.color;
    inputs.connectorWidth.value = conn.width;
    inputs.connectorStyle.value = conn.style || "solid";
  }
}

inputs.bgColor.oninput = () => mutateNode(n => n.color = inputs.bgColor.value);
inputs.borderColor.oninput = () => mutateNode(n => n.borderColor = inputs.borderColor.value);
inputs.opacity.oninput = () => mutateNode(n => n.opacity = Number(inputs.opacity.value));
inputs.borderRadius.oninput = () => mutateNode(n => n.borderRadius = Number(inputs.borderRadius.value));

inputs.textColor.oninput = () => mutateNode(n => n.fontColor = inputs.textColor.value);
inputs.fontSize.oninput = () => mutateNode(n => n.fontSize = Number(inputs.fontSize.value));
inputs.textAlign.onchange = () => mutateNode(n => n.textAlign = inputs.textAlign.value);
inputs.fontWeight.onchange = () => mutateNode(n => n.fontWeight = inputs.fontWeight.value);
inputs.fontFamily.onchange = () => mutateNode(n => n.fontFamily = inputs.fontFamily.value);

// inputs.connectorColor.oninput = () => mutateNode(n => n.connectorColor = inputs.connectorColor.value);
// inputs.connectorWidth.oninput = () => mutateNode(n => n.connectorWidth = Number(inputs.connectorWidth.value));
inputs.connectorColor.oninput = () => {
  const node = State.getNodeById(State.selectedNodeId);
  const conn = State.connections.find(c => c.id === State.selectedConnectionId);

  if (node) {
    mutateNode(n => {
      n.connectorColor = inputs.connectorColor.value;
      // State.connections.forEach(c => { if (c.from === n.id) c.color = n.connectorColor; });
    });
  } else if (conn) {
    State.snapshotState();
    conn.color = inputs.connectorColor.value;
    triggerRedraw();
    queueStateSync("node_update");
  }
};

inputs.connectorWidth.oninput = () => {
  const node = State.getNodeById(State.selectedNodeId);
  const conn = State.connections.find(c => c.id === State.selectedConnectionId);

  if (node) {
    mutateNode(n => {
      n.connectorWidth = Number(inputs.connectorWidth.value);
      State.connections.forEach(c => { if (c.from === n.id) c.width = n.connectorWidth; });
    });
  } else if (conn) {
    State.snapshotState();
    conn.width = Number(inputs.connectorWidth.value);
    triggerRedraw();
    queueStateSync("node_update");
  }
};

inputs.connectorStyle.onchange = () => {
  const conn = State.connections.find(
    c => c.id === State.selectedConnectionId
  );

  if (!conn) return;

  State.snapshotState();
  conn.style = inputs.connectorStyle.value;

  triggerRedraw();
  queueStateSync("node_update");
};

inputs.nodeImageInput.onchange = () => {
  const node = getSelectedNode();
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


inputs.bgType.onchange = () => {
  State.snapshotState();
  State.background.type = inputs.bgType.value;
  triggerRedraw();
};

inputs.bgCanvasColor.oninput = () => {
  State.snapshotState();
  State.background.color = inputs.bgCanvasColor.value;
  triggerRedraw();
};

inputs.bgGridColor.oninput = () => {
  State.snapshotState();
  State.background.gridColor = inputs.bgGridColor.value;
  triggerRedraw();
};

inputs.bgDotColor.oninput = () => {
  State.snapshotState();
  State.background.dotColor = inputs.bgDotColor.value;
  triggerRedraw();
};

buttons.removeImage.onclick = () => {
  mutateNode(n => {
    n.image = null;
  });
};

buttons.deleteNode.onclick = () => {
  if (!State.selectedNodeId) return;
  State.deleteNodeLogic(State.selectedNodeId, false);
  rebuild();
  queueStateSync("node_delete");
};

buttons.deleteSubtree.onclick = () => {
  if (!State.selectedNodeId) return;
  State.deleteNodeLogic(State.selectedNodeId, true);
  rebuild();
  queueStateSync("node_delete");
};
