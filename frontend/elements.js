export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d");
export const panel = document.getElementById("custom-panel");

export const inputs = {
  bgColor: document.getElementById("bg-color"),
  borderColor: document.getElementById("border-color"),
  textColor: document.getElementById("text-color"),
  opacity: document.getElementById("opacity"),
  fontSize: document.getElementById("font-size"),
  textAlign: document.getElementById("text-align"),
  fontWeight: document.getElementById("font-weight"),
  borderRadius: document.getElementById("border-radius"),
  connectorColor: document.getElementById("connector-color"),
  connectorWidth: document.getElementById("connector-width"),
  connectorStyle: document.getElementById("connector-style"),
  fontFamily: document.getElementById("font-family"),
  bgType: document.getElementById("bg-type"),
  bgCanvasColor: document.getElementById("bg-canvas-color"),
  bgGridColor: document.getElementById("bg-grid-color"),
  bgDotColor: document.getElementById("bg-dot-color"),
  // FILE INPUTS BELONG HERE
  nodeImageInput: document.getElementById("node-image-input"),
};

export const buttons = {
  deleteNode: document.getElementById("delete-node"),
  deleteSubtree: document.getElementById("delete-subtree"),
  undo: document.getElementById("undo-btn"),
  redo: document.getElementById("redo-btn"),
  zoomIn: document.getElementById("zoom-in"),
  zoomOut: document.getElementById("zoom-out"),

  //  ACTION BUTTON
  removeImage: document.getElementById("remove-image"),
};
