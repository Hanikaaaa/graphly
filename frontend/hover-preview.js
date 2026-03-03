let previewEl = null;
let lastPreviewKey = null;

function ensurePreviewElement() {
  if (previewEl) return previewEl;

  const el = document.createElement("div");
  el.className = "hover-preview hidden";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  previewEl = el;
  return el;
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function showHoverPreview(data) {
  if (!data || (data.type !== "node" && data.type !== "edge")) return;

  const key = JSON.stringify(data);
  if (key === lastPreviewKey) return;
  lastPreviewKey = key;

  const el = ensurePreviewElement();

  const title = data.type === "node" ? "Node Preview" : "Connector Preview";
  const text = data.type === "node" ? data.text || "" : data.label || "";
  const image = data.type === "node" ? data.image || "" : "";

  el.innerHTML = `
    <div class="hover-preview-title">${escapeHTML(title)}</div>
    ${image ? `<img class="hover-preview-image" src="${escapeHTML(image)}" alt="Preview image" />` : ""}
    <div class="hover-preview-text">${escapeHTML(text || "(empty)")}</div>
  `;

  el.classList.remove("hidden");
}

export function hideHoverPreview() {
  if (!previewEl) return;
  previewEl.classList.add("hidden");
  lastPreviewKey = null; // ⭐ add this line
}

export function initHoverPreview() {
  ensurePreviewElement();
}

function autoSizeInput(input) {
  input.style.width = "auto";
  input.style.width = input.scrollWidth + 2 + "px";
}

document.addEventListener("input", (e) => {
  if (e.target.classList.contains("input-text")) {
    autoSizeInput(e.target);
  }
});