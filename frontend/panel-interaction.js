// panel-interactions.js
// Handles panel dragging + resizing ONLY (UI concern)

const panel = document.getElementById("custom-panel");
const dragHandle = document.getElementById("panel-drag-handle");
const resizeHandle = document.getElementById("panel-resize-handle");

if (!panel || !dragHandle || !resizeHandle) {
  // Fail silently if panel not present
  console.warn("Panel interactions not initialized (missing elements)");
} else {
  /* =========================================================
     DRAGGING
  ========================================================= */

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  dragHandle.addEventListener("mousedown", (e) => {
    // Only left click
    if (e.button !== 0) return;

    isDragging = true;

    panel.style.bottom = "auto";
    
    const rect = panel.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "move";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newLeft = e.clientX - dragOffsetX;
    let newTop = e.clientY - dragOffsetY;

    // ✅ keep inside viewport
    newLeft = Math.max(0, Math.min(newLeft, vw - panelRect.width));
    newTop = Math.max(0, Math.min(newTop, vh - panelRect.height));

    panel.style.left = `${newLeft}px`;
    panel.style.top = `${newTop}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;

    isDragging = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  });

  /* =========================================================
     RESIZING
  ========================================================= */

  let isResizing = false;

  resizeHandle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;

    e.stopPropagation();
    isResizing = true;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "nwse-resize";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const rect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newWidth = e.clientX - rect.left;
    let newHeight = e.clientY - rect.top;

    // ✅ min constraints
    // newWidth = Math.max(260, newWidth);
    newHeight = Math.max(300, newHeight);

    // ✅ max constraints (stay in screen)
    // newWidth = Math.min(newWidth, vw - rect.left);
    newHeight = Math.min(newHeight, vh - rect.top);

    // panel.style.width = `${newWidth}px`;
    panel.style.height = `${newHeight}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!isResizing) return;

    isResizing = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  });
}