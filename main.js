import * as State from "./state.js";
import * as Render from "./renderer.js";
import * as DOM from "./dom-manager.js";
import { initInputHandler, attachNodeHandlers } from "./input-handler.js";
import { updatePanel } from "./ui-panel.js";
import { canvas } from "./elements.js";

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

export function rebuild() {
  State.clearSelection();       
  DOM.clearAllNodes();
  State.nodes.forEach(node => attachNodeHandlers(node));
  redraw();
}


function createInitialNode() {
  if (State.nodes.length > 0) return;

  const node = State.createNodeObject(
    window.innerWidth / 2 - 70,
    window.innerHeight / 2 - 40
  );

  State.addNode(node);
  attachNodeHandlers(node);
}

function init() {
  // Canvas size
  Render.resizeCanvas();

  window.addEventListener("resize", () => {
    Render.resizeCanvas();
    redraw();
  });

  createInitialNode();

  // Attach input system
  initInputHandler();

  // Initial render
  redraw();
}

init();
