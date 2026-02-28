import { ShapeRegistry } from "./shapes.js";
import { getSelectionBounds } from "./geometry/bounds.js";

// Group Overlay

let groupOverlay = null;

function createGroupOverlay() {
  if (groupOverlay) return groupOverlay;

  groupOverlay = document.createElement("div");
  groupOverlay.className = "group-overlay";

  ["tl", "tr", "bl", "br"].forEach((dir) => {
    const handle = document.createElement("div");
    handle.className = "group-handle";
    handle.dataset.dir = dir;
    groupOverlay.appendChild(handle);
  });

  document.body.appendChild(groupOverlay);
  return groupOverlay;
}

function getShape(node) {
  return ShapeRegistry[node.shape] || ShapeRegistry.rectangle;
}

export function updateGroupOverlay({ bounds, zoomLevel, offsetX, offsetY }) {
  if (!bounds) {
    if (groupOverlay) groupOverlay.style.display = "none";
    return;
  }

  const { minX, minY, maxX, maxY } = bounds;

  overlay.style.left = minX * zoomLevel + offsetX + "px";
  overlay.style.top = minY * zoomLevel + offsetY + "px";
  overlay.style.width = (maxX - minX) * zoomLevel + "px";
  overlay.style.height = (maxY - minY) * zoomLevel + "px";
}

export function getGroupOverlay() {
  return groupOverlay;
}

export function createNodeDOM(node, handlers) {
  const el = document.createElement("div");
  el.className = "node-input";
  el.id = node.id;

  const shapeLayer = document.createElement("div");
  shapeLayer.className = "node-shape-layer";
  el.appendChild(shapeLayer);

  // Image
  if (node.image) {
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "node-image-wrapper";

    const img = document.createElement("img");
    img.className = "node-image";
    img.src = node.image;

    imageWrapper.appendChild(img);
    shapeLayer.appendChild(imageWrapper);

    el.classList.add("has-image");
  }

  // Display Text
  const textDisplay = document.createElement("div");
  textDisplay.className = "node-text";
  textDisplay.textContent = node.text || "Type here…";

  textDisplay.ondblclick = (e) => {
    e.stopPropagation();
    handlers.onEdit(node.id);
  };

  // Text Input
  const textInput = document.createElement("textarea");
  textInput.className = "node-text-input";
  textInput.value = node.text || "";

  textInput.onblur = () => {
    handlers.onSave(node.id, textInput.value);
  };

  textInput.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textInput.blur();
    }
  };

  el._shapeLayer = shapeLayer;
  el._text = textDisplay;
  el._input = textInput;

  // Connectors
  const shape = getShape(node);

  shape.meta.connectors.forEach((side) => {
    const connector = document.createElement("div");
    connector.className = `node-connector ${side}`;

    connector.onmousedown = (e) => {
      e.stopPropagation();
      handlers.onConnectStart(e, node.id, side);
    };

    el.appendChild(connector);
  });

  // Resize Handles
  const resizeHandles = [];

  ["top-left", "top-right", "bottom-right", "bottom-left"].forEach((pos) => {
    const handle = document.createElement("div");
    handle.className = `node-resize-handle ${pos}`;
    handle.dataset.direction = pos;

    handle.onmousedown = (e) => {
      e.stopPropagation();
      handlers.onResizeStart(e, node.id, pos);
    };

    resizeHandles.push(handle);
    el.appendChild(handle);
  });

  el._resizeHandles = resizeHandles;

  // Drag + Select

  el.onmousedown = (e) => {
    if (
      e.target.closest(".node-connector") ||
      e.target.closest(".node-resize-handle")
    )
      return;

    handlers.onSelect?.(node.id, e);
    handlers.onDragStart(e, node.id);
  };

  el.appendChild(textDisplay);
  el.appendChild(textInput);

  document.body.appendChild(el);
}

export function syncNodeDOM(
  node,
  { isSelected, isEditing, zoomLevel, offsetX, offsetY },
) {
  const el = document.getElementById(node.id);
  if (!el) return;

  const shapeLayer = el._shapeLayer;

  // Image Sync

  let imgWrapper = shapeLayer.querySelector(".node-image-wrapper");

  if (node.image) {
    if (!imgWrapper) {
      imgWrapper = document.createElement("div");
      imgWrapper.className = "node-image-wrapper";

      const img = document.createElement("img");
      img.className = "node-image";

      imgWrapper.appendChild(img);
      shapeLayer.appendChild(imgWrapper);
    }

    const img = imgWrapper.querySelector("img");
    img.src = node.image;

    el.classList.add("has-image");
  } else {
    imgWrapper?.remove();
    el.classList.remove("has-image");
  }

  // Position + Scale

  el.style.left = `${node.x * zoomLevel + offsetX}px`;
  el.style.top = `${node.y * zoomLevel + offsetY}px`;

  el.style.width = `${node.width}px`;
  el.style.height = `${node.height}px`;

  el.style.transform = `scale(${zoomLevel})`;
  el.style.transformOrigin = "top left";

  // Visual Styles

  shapeLayer.style.backgroundColor = node.color;

  shapeLayer.style.border = `${1 / zoomLevel}px ${node.borderStyle} ${node.borderColor}`;

  el.style.opacity = node.opacity;

  // Shape Layout

  const shape = getShape(node);

  // Reset clip before applying new shape
  shapeLayer.style.clipPath = "";

  shape.applyLayout?.(node, el);
  shape.applyConnectorLayout?.(node, el, zoomLevel);

  // Border Radius

  if (shape.meta.supportsBorderRadius) {
    shapeLayer.style.borderRadius = `${node.borderRadius}px`;
  } else {
    shapeLayer.style.borderRadius = "0px";
  }

  // Text

  const text = el._text;
  const input = el._input;

  text.textContent = node.text || "Type here…";
  input.value = node.text || "";

  text.style.color = node.fontColor;
  input.style.color = node.fontColor;

  text.style.fontSize = `${node.fontSize}px`;
  input.style.fontSize = `${node.fontSize}px`;

  text.style.fontFamily = node.fontFamily;
  input.style.fontFamily = node.fontFamily;

  text.style.textAlign = node.textAlign;
  input.style.textAlign = node.textAlign;

  text.style.fontWeight = node.fontWeight;
  input.style.fontWeight = node.fontWeight;

  if (isEditing) {
    text.style.display = "none";
    input.style.display = "flex";
    if (document.activeElement !== input) {
      input.focus();
    }
  } else {
    text.style.display = "flex";
    input.style.display = "none";
  }

  // PREVENT UI SCALE DISTORTION

  el.querySelectorAll(".node-resize-handle").forEach((h) => {
    h.style.transform = `scale(${1 / zoomLevel})`;
  });

  // STATE CLASSES
  el.classList.toggle("selected", isSelected);
  el.classList.toggle("editing", isEditing);
}

export function removeNodeDOM(id) {
  document.getElementById(id)?.remove();
}

export function clearAllNodes() {
  document.querySelectorAll(".node-input").forEach((el) => el.remove());
}
