import * as State from "./state.js";
import { ShapeRegistry } from "./shapes.js";

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

  // Connectors
  const shape = ShapeRegistry[node.shape] || ShapeRegistry.rectangle;

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

  ["top-left", "top-right", "bottom-right", "bottom-left"].forEach(
    (pos) => {
      const handle = document.createElement("div");
      handle.className = `node-resize-handle ${pos}`;
      handle.dataset.direction = pos;

      handle.onmousedown = (e) => {
        e.stopPropagation();
        handlers.onResizeStart(e, node.id, pos);
      };

      el.appendChild(handle);
    }
  );

  // Drag + Select

  el.onmousedown = (e) => {
    if (
      e.target.closest(".node-connector") ||
      e.target.closest(".node-resize-handle")
    )
      return;

    handlers.onSelect?.(node.id);
    handlers.onDragStart(e, node.id);
  };

  el.appendChild(textDisplay);
  el.appendChild(textInput);

  document.body.appendChild(el);
}

export function syncNodeDOM(
  node,
  { isSelected, isEditing, zoomLevel }
) {
  const el = document.getElementById(node.id);
  if (!el) return;

  const shapeLayer = el.querySelector(".node-shape-layer");

  // Image Sync

  let imgWrapper =
    shapeLayer.querySelector(".node-image-wrapper");

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

  el.style.left = `${node.x * zoomLevel + State.offsetX}px`;
  el.style.top = `${node.y * zoomLevel + State.offsetY}px`;

  el.style.width = `${node.width}px`;
  el.style.height = `${node.height}px`;

  el.style.transform = `scale(${zoomLevel})`;
  el.style.transformOrigin = "top left";

  // Visual Styles

  shapeLayer.style.backgroundColor = node.color;

  shapeLayer.style.border =
    `${1 / zoomLevel}px ${node.borderStyle} ${node.borderColor}`;

  el.style.opacity = node.opacity;

  // Shape Layout

  const shape =
    ShapeRegistry[node.shape] || ShapeRegistry.rectangle;

  // Reset clip before applying new shape
  shapeLayer.style.clipPath = "";

  shape.applyLayout?.(node, el);
  shape.applyConnectorLayout?.(node, el, zoomLevel);

  // Border Radius

  if (shape.meta.supportsBorderRadius) {
    shapeLayer.style.borderRadius =
      `${node.borderRadius}px`;
  } else {
    shapeLayer.style.borderRadius = "0px";
  }

  // Text

  const text = el.querySelector(".node-text");
  const input = el.querySelector(".node-text-input");

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
  document
    .querySelectorAll(".node-input")
    .forEach((el) => el.remove());
}