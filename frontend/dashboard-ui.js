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
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getAccessTypeLabel(accessType, sharedWith = []) {
  switch (accessType?.toLowerCase()) {
    case "private": return { icon: "🔒", label: "Private" };
    case "shared":  return { icon: "👥", label: `Shared${sharedWith.length ? ` · ${sharedWith.length}` : ""}` };
    case "public":  return { icon: "🌐", label: "Public" };
    default:        return { icon: "🔒", label: "Private" };
  }
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
    ? canvases.map((canvas) => {
        const { icon, label } = getAccessTypeLabel(canvas.accessType, canvas.sharedWith);
        const isOwner = canvas.ownerEmail === userEmail;
        return `
          <button class="canvas-item" data-canvas-id="${escapeHTML(canvas.id)}" type="button">
            <span class="canvas-item-title">${escapeHTML(canvas.title || "Untitled Canvas")}</span>
            <span class="canvas-item-right">
              <span class="canvas-item-access">${icon} ${escapeHTML(label)}</span>
              <span class="canvas-item-date">Updated ${escapeHTML(formatDate(canvas.updatedAt))}</span>
              ${!isOwner ? `<span class="canvas-item-owner">${escapeHTML(canvas.ownerEmail)}</span>` : ""}
            </span>
          </button>`;
      }).join("")
    : `<p class="dashboard-empty">No canvases yet — create your first one above.</p>`;

  root.innerHTML = `
    <main class="landing-shell">
      <section class="dashboard-card">

        <!-- Header -->
        <div class="dash-header">
          <div class="dash-title-block">
            <h1>Canvases</h1>
            <span class="dash-user">${escapeHTML(userEmail || "")}</span>
          </div>
          <button id="dashboard-logout-btn" class="ghost-btn" type="button">Sign out</button>
        </div>

        <!-- Create -->
        <div class="create-block ${creating ? "creating" : ""}">
          <div class="create-row">
            <input id="new-canvas-title" type="text" placeholder="New canvas name…" maxlength="100" ${creating ? "disabled" : ""} />
            <select id="new-canvas-access" ${creating ? "disabled" : ""}>
              <option value="private">🔒 Private</option>
              <option value="shared">👥 Shared</option>
              <option value="public">🌐 Public</option>
            </select>
            <button id="create-canvas-btn" class="create-btn" type="button" ${creating ? "disabled" : ""}>
              ${creating ? "Creating…" : "Create"}
            </button>
          </div>

          <!-- Shared email input — hidden until "Shared" is chosen -->
          <div id="shared-emails-section" class="shared-section" aria-hidden="true">
            <div class="shared-input-row">
              <input id="shared-email-input" type="email" placeholder="Add people by email…" />
              <button id="add-shared-email-btn" type="button" class="ghost-btn">Add</button>
            </div>
            <div id="shared-emails-list" class="shared-chips"></div>
          </div>
        </div>

        <p class="error-text" ${error ? "" : "hidden"}>${escapeHTML(error)}</p>

        <!-- Canvas list -->
        <div class="canvas-list ${loading ? "loading" : ""}">
          ${loading ? `<p class="dashboard-empty">Loading…</p>` : itemsHTML}
        </div>

        <!-- Join -->
        <div class="join-row">
          <input id="join-canvas-id" type="text" placeholder="Join canvas by ID…" />
          <button id="join-canvas-btn" class="ghost-btn" type="button">Join</button>
        </div>

      </section>
    </main>`;

  /* — Logout — */
  root.querySelector("#dashboard-logout-btn")?.addEventListener("click", onLogout);

  /* — Access type → show/hide shared email section — */
  const accessSelect  = root.querySelector("#new-canvas-access");
  const sharedSection = root.querySelector("#shared-emails-section");
  const emailInput    = root.querySelector("#shared-email-input");
  const addEmailBtn   = root.querySelector("#add-shared-email-btn");
  const emailList     = root.querySelector("#shared-emails-list");
  let sharedEmails    = [];

  accessSelect?.addEventListener("change", () => {
    const isShared = accessSelect.value === "shared";
    sharedSection.classList.toggle("visible", isShared);
    sharedSection.setAttribute("aria-hidden", String(!isShared));
    if (!isShared) { sharedEmails = []; renderChips(); }
  });

  function renderChips() {
    emailList.innerHTML = sharedEmails.map(e => `
      <span class="chip">
        ${escapeHTML(e)}
        <button class="chip-remove" data-email="${escapeHTML(e)}" aria-label="Remove ${escapeHTML(e)}">✕</button>
      </span>`).join("");
    emailList.querySelectorAll(".chip-remove").forEach(btn =>
      btn.addEventListener("click", () => {
        sharedEmails = sharedEmails.filter(e => e !== btn.dataset.email);
        renderChips();
      })
    );
  }

  function addEmail() {
    const email = emailInput.value.trim().toLowerCase();
    if (!email) return;
    if (!email.includes("@")) { showToast("Enter a valid email", "error"); return; }
    if (sharedEmails.includes(email)) { showToast("Already added", "error"); return; }
    sharedEmails.push(email);
    emailInput.value = "";
    renderChips();
  }

  addEmailBtn?.addEventListener("click", addEmail);
  emailInput?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } });

  /* — Create — */
  root.querySelector("#create-canvas-btn")?.addEventListener("click", () => {
    const title = root.querySelector("#new-canvas-title").value.trim();
    if (!title) { showToast("Enter a canvas name", "error"); return; }
    onCreate({
      title,
      accessType: accessSelect.value,
      sharedWith: accessSelect.value === "shared" ? sharedEmails : [],
    });
  });

  /* — Open — */
  root.querySelectorAll(".canvas-item").forEach(btn =>
    btn.addEventListener("click", () => btn.dataset.canvasId && onOpen(btn.dataset.canvasId))
  );

  /* — Join — */
  root.querySelector("#join-canvas-btn")?.addEventListener("click", () => {
    const id = root.querySelector("#join-canvas-id").value.trim();
    if (!id) { showToast("Enter a canvas ID", "error"); return; }
    onOpen(id);
  });
}

function showToast(message, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add("show")); });
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 3000);
}