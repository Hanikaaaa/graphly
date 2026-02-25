function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Updated just now";
  }

  return `Updated ${date.toLocaleString()}`;
}

export function renderCanvasDashboard(root, options) {
  const {
    userEmail,
    canvases,
    loading = false,
    error = "",
    creating = false,
    onCreate,
    onOpen,
    onLogout,
  } = options;

  const itemsHTML = canvases.length
    ? canvases
      .map((canvas) => `
        <button class="canvas-item" data-canvas-id="${escapeHTML(canvas.id)}" type="button">
          <span class="canvas-item-title">${escapeHTML(canvas.title || "Untitled Canvas")}</span>
          <span class="canvas-item-meta">${escapeHTML(formatDate(canvas.updatedAt))}</span>
        </button>
      `)
      .join("")
    : `<p class="dashboard-empty">No canvases yet. Create your first one to start drawing.</p>`;

  root.innerHTML = `
    <main class="landing-shell">
      <section class="dashboard-card dashboard-wide">
        <div class="dashboard-head">
          <div>
            <h1>Your Canvases</h1>
            <p class="subtitle">Signed in as <strong>${escapeHTML(userEmail || "unknown user")}</strong></p>
          </div>
          <button id="dashboard-logout-btn" class="secondary-btn" type="button">Logout</button>
        </div>

        <div class="dashboard-actions">
          <button id="create-canvas-btn" class="primary-btn" type="button" ${loading || creating ? "disabled" : ""}>
            ${creating ? "Creating..." : "New Canvas"}
          </button>
        </div>

        <p class="error-text" ${error ? "" : "hidden"}>${escapeHTML(error)}</p>

        <div class="canvas-list ${loading ? "canvas-list-loading" : ""}">
          ${loading ? `<p class="dashboard-empty">Loading canvases...</p>` : itemsHTML}
        </div>
      </section>
    </main>
  `;

  const logoutButton = root.querySelector("#dashboard-logout-btn");
  logoutButton?.addEventListener("click", () => onLogout());

  const createButton = root.querySelector("#create-canvas-btn");
  createButton?.addEventListener("click", () => onCreate());

  root.querySelectorAll(".canvas-item").forEach((button) => {
    button.addEventListener("click", () => {
      const canvasID = button.dataset.canvasId;
      if (!canvasID) return;
      onOpen(canvasID);
    });
  });
}
