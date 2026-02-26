import * as State from "./state.js";

export function createNodeDOM(node, handlers) {
  const el = document.createElement("div");
  el.className = "node-input";
  el.id = node.id;

  // Image
  if (node.image) {
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "node-image-wrapper";

    const img = document.createElement("img");
    img.className = "node-image";
    img.src = node.image;

    imageWrapper.appendChild(img);
    el.appendChild(imageWrapper);

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
  textInput.value = node.text;

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
  ["top", "right", "bottom", "left"].forEach(side => {
    const connector = document.createElement("div");
    connector.className = `node-connector ${side}`;

    connector.onmousedown = (e) => {
      e.stopPropagation();
      handlers.onConnectStart(e, node.id, side);
    };

    el.appendChild(connector);
  });

  // Resize Handles
  const resizePositions = [
    "top-left",
    "top-right",
    "bottom-right",
    "bottom-left"
  ];

  resizePositions.forEach(pos => {
    const handle = document.createElement("div");
    handle.className = `node-resize-handle ${pos}`;
    handle.dataset.direction = pos;

    handle.onmousedown = (e) => {
      e.stopPropagation();
      handlers.onResizeStart(e, node.id, pos);
    };

    el.appendChild(handle);
  });

  // Drag
  el.onmousedown = (e) => {
    if (
      e.target.classList.contains("node-text") ||
      e.target.classList.contains("node-text-input") ||
      e.target.classList.contains("node-connector") ||
      e.target.classList.contains("node-resize-handle")
    ) return;

    handlers.onDragStart(e, node.id);
  };

  el.appendChild(textDisplay);
  el.appendChild(textInput);
  document.body.appendChild(el);
}


export function syncNodeDOM(node, {
  isSelected,
  isEditing,
  zoomLevel
}) {
  const el = document.getElementById(node.id);
  if (!el) return;

  // IMAGE SYNC
let imgWrapper = el.querySelector(".node-image-wrapper");

if (node.image) {
  if (!imgWrapper) {
    imgWrapper = document.createElement("div");
    imgWrapper.className = "node-image-wrapper";

    const img = document.createElement("img");
    img.className = "node-image";
    imgWrapper.appendChild(img);

    el.prepend(imgWrapper);
  }

  imgWrapper.querySelector("img").src = node.image;
  el.classList.add("has-image");
} else {
  imgWrapper?.remove();
  el.classList.remove("has-image");
}

  //Position and Size
  el.style.left = `${node.x * zoomLevel + State.offsetX}px`;
  el.style.top = `${node.y * zoomLevel + State.offsetY}px`;
  el.style.width = `${node.width}px`;
  el.style.height = `${node.height}px`;
  el.style.transform = `scale(${zoomLevel})`;
  el.style.transformOrigin = "top left";

  // Box Styles
  el.style.backgroundColor = node.color;
  el.style.opacity = node.opacity;
  el.style.borderRadius = `${node.borderRadius}px`;
  el.style.border = `${1 / zoomLevel}px ${node.borderStyle} ${node.borderColor}`;


  // Text Styles
  const text = el.querySelector(".node-text");
  const input = el.querySelector(".node-text-input");

  text.textContent = node.text || "Type here…";
  input.value = node.text || "";

  text.style.color = node.fontColor;
  input.style.color = node.fontColor;

  text.style.fontSize = `${node.fontSize * zoomLevel}px`;
  input.style.fontSize = `${node.fontSize * zoomLevel}px`;

  text.style.fontFamily = node.fontFamily;
  input.style.fontFamily = node.fontFamily;

  text.style.textAlign = node.textAlign;
  input.style.textAlign = node.textAlign;

  text.style.fontWeight = node.fontWeight;
  input.style.fontWeight = node.fontWeight;

  // preventing UI Scaling
  el.querySelectorAll(".node-resize-handle").forEach(h => {
    h.style.transform = `scale(${1 / zoomLevel})`;
  });

  el.querySelectorAll(".node-connector").forEach(c => {
    c.style.transform = `scale(${1 / zoomLevel})`;
  });

  // State Classes
  el.classList.toggle("selected", isSelected);
  el.classList.toggle("editing", isEditing);
}

export function removeNodeDOM(id) {
  document.getElementById(id)?.remove();
}

export function clearAllNodes() {
  document.querySelectorAll(".node-input").forEach(el => el.remove());
}
