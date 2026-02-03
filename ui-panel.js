import * as State from "./state.js";
import { inputs, buttons, panel } from "./elements.js";
import { triggerRedraw } from "./input-handler.js";
import { rebuild } from "./main.js";

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
}

export function updatePanel() {
  const node = getSelectedNode();

  if (!node) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");

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

inputs.connectorColor.oninput = () => mutateNode(n => n.connectorColor = inputs.connectorColor.value);
inputs.connectorWidth.oninput = () => mutateNode(n => n.connectorWidth = Number(inputs.connectorWidth.value));


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
    inputs.nodeImageInput.value = "";
  };

  reader.readAsDataURL(file);
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
};

buttons.deleteSubtree.onclick = () => {
  if (!State.selectedNodeId) return;
  State.deleteNodeLogic(State.selectedNodeId, true);
  rebuild();
};
