import * as State from "./state.js";

function clientToWorld(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left - State.offsetX) / State.zoomLevel;
  const y = (clientY - rect.top - State.offsetY) / State.zoomLevel;
  return { x, y };
}

function ensureOverlay() {
  let overlay = document.getElementById("export-region-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "export-region-overlay";
    overlay.className = "export-region-overlay hidden";
    overlay.innerHTML = `
      <div class="export-region-hint">Drag to export a canvas region • Esc to cancel</div>
      <div class="export-region-box"></div>
    `;
    document.body.appendChild(overlay);
  }
  return overlay;
}

function setBoxRect(box, x1, y1, x2, y2) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;
}

export function startRegionSelection(canvas, handlers = {}) {
  const overlay = ensureOverlay();
  const box = overlay.querySelector(".export-region-box");
  const hint = overlay.querySelector(".export-region-hint");

  let active = true;
  let dragging = false;
  let startClientX = 0;
  let startClientY = 0;
  let lastClientX = 0;
  let lastClientY = 0;

  overlay.classList.remove("hidden");
  requestAnimationFrame(() => overlay.classList.add("active"));
  box.style.width = "0px";
  box.style.height = "0px";
  hint.textContent = "Drag to export a canvas region • Esc to cancel";

  const onMouseDown = (e) => {
    if (!active) return;
    if (e.button !== 0) return;
    if (
      e.target.closest(".topbar") ||
      e.target.closest("#custom-panel") ||
      e.target.closest(".ai-chatbox") ||
      e.target.closest("#minimap")
    ) {
      return;
    }

    dragging = true;
    startClientX = e.clientX;
    startClientY = e.clientY;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    setBoxRect(box, startClientX, startClientY, lastClientX, lastClientY);

    e.preventDefault();
    e.stopPropagation();
  };

  const onMouseMove = (e) => {
    if (!active || !dragging) return;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    setBoxRect(box, startClientX, startClientY, lastClientX, lastClientY);
    e.preventDefault();
    e.stopPropagation();
  };

  const onMouseUp = (e) => {
    if (!active || !dragging) return;
    dragging = false;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    setBoxRect(box, startClientX, startClientY, lastClientX, lastClientY);

    const minSize = 8;
    const pixelW = Math.abs(lastClientX - startClientX);
    const pixelH = Math.abs(lastClientY - startClientY);
    if (pixelW < minSize || pixelH < minSize) {
      hint.textContent = "Selection too small. Drag a larger area.";
      return;
    }

    const a = clientToWorld(canvas, startClientX, startClientY);
    const b = clientToWorld(canvas, lastClientX, lastClientY);
    const bounds = {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    };

    cleanup();
    handlers.onComplete?.(bounds);
    e.preventDefault();
    e.stopPropagation();
  };

  const onKeyDown = (e) => {
    if (!active) return;
    if (e.key !== "Escape") return;
    cleanup();
    handlers.onCancel?.();
  };

  function cleanup() {
    if (!active) return;
    active = false;
    overlay.classList.remove("active");
    overlay.classList.add("hidden");
    window.removeEventListener("mousedown", onMouseDown, true);
    window.removeEventListener("mousemove", onMouseMove, true);
    window.removeEventListener("mouseup", onMouseUp, true);
    window.removeEventListener("keydown", onKeyDown, true);
  }

  window.addEventListener("mousedown", onMouseDown, true);
  window.addEventListener("mousemove", onMouseMove, true);
  window.addEventListener("mouseup", onMouseUp, true);
  window.addEventListener("keydown", onKeyDown, true);

  return cleanup;
}
