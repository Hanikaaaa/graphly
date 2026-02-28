const PREVIEW_IMAGES = [
  "/assets/hero_landing_page.png",
  "/assets/steps01.png",
  "/assets/step02.png",
  "/assets/step03.png",
];

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAccessBadge(accessType) {
  switch ((accessType || "private").toLowerCase()) {
    case "shared":
      return {
        label: "Shared",
        classes: "border-emerald-300/30 bg-emerald-400/15 text-emerald-200",
      };
    case "public":
      return {
        label: "Public",
        classes: "border-blue-300/30 bg-blue-400/15 text-blue-200",
      };
    default:
      return {
        label: "Private",
        classes: "border-white/15 bg-white/10 text-slate-100",
      };
  }
}

function getPreviewImage(canvas, index) {
  if (typeof canvas?.previewUrl === "string" && canvas.previewUrl.trim() !== "") {
    return canvas.previewUrl;
  }

  return PREVIEW_IMAGES[index % PREVIEW_IMAGES.length];
}

function DashboardHeader({ userEmail, search, filter, sort, view }) {
  const avatar = (userEmail || "U").trim().charAt(0).toUpperCase() || "U";

  return `
    <header class="sticky top-4 z-30 rounded-2xl border border-white/10 bg-[#020617]/70 shadow-2xl backdrop-blur-xl">
      <div class="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl p-0"><img src="/assets/graphly02.png" alt="User avatar" class="h-full w-full object-cover rounded-xl"></div>
          <div>
            <p class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">Graphly</p>
            <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Canvases</p>
          </div>
        </div>

        <div class="grid flex-1 gap-3 md:grid-cols-2 lg:mx-6 lg:max-w-3xl lg:grid-cols-[minmax(260px,1fr)_auto_auto_auto]">
          <label class="relative block">
            <span class="sr-only">Search canvases</span>
            <input
              id="canvas-search"
              type="search"
              value="${escapeHTML(search)}"
              placeholder="Search canvases"
              class="w-full rounded-xl border border-white/10 bg-[#0B1220]/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </label>

          <select id="canvas-filter" class="rounded-xl border border-white/10 bg-[#0B1220]/70 px-3 py-2.5 text-sm text-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="all" ${filter === "all" ? "selected" : ""}>All</option>
            <option value="owner" ${filter === "owner" ? "selected" : ""}>Owner</option>
            <option value="shared" ${filter === "shared" ? "selected" : ""}>Shared</option>
            <option value="private" ${filter === "private" ? "selected" : ""}>Private</option>
          </select>

          <select id="canvas-sort" class="rounded-xl border border-white/10 bg-[#0B1220]/70 px-3 py-2.5 text-sm text-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="updated_desc" ${sort === "updated_desc" ? "selected" : ""}>Last edited</option>
            <option value="updated_asc" ${sort === "updated_asc" ? "selected" : ""}>Oldest edited</option>
            <option value="title_asc" ${sort === "title_asc" ? "selected" : ""}>Title A-Z</option>
          </select>

          <div class="inline-flex rounded-xl border border-white/10 bg-[#0B1220]/70 p-1">
            <button id="view-grid-btn" type="button" aria-label="Grid view" class="rounded-lg px-2.5 py-2 transition ${view === "grid" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"}">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm8 0h6v6h-6v-6Z" /></svg>
            </button>
            <button id="view-list-btn" type="button" aria-label="List view" class="rounded-lg px-2.5 py-2 transition ${view === "list" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"}">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 4.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 0h10v2H7v-2Zm-4 5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 0h10v2H7v-2Zm-4 5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 0h10v2H7v-2Z" /></svg>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 rounded-full border border-white/10 bg-[#0B1220]/70 px-2 py-1.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 text-xs font-bold text-white">${escapeHTML(avatar)}</div>
            <span class="hidden max-w-[180px] truncate text-xs text-slate-200 sm:block">${escapeHTML(userEmail || "")}</span>
          </div>
          <button id="dashboard-logout-btn" type="button" class="rounded-xl border border-white/10 bg-[#0B1220]/70 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white">Sign out</button>
        </div>
      </div>
    </header>
  `;
}

function CanvasCard({ canvas, userEmail, index, view }) {
  const badge = getAccessBadge(canvas.accessType);
  const preview = getPreviewImage(canvas, index);
  const title = escapeHTML(canvas.title || "Untitled Canvas");
  const ownerEmail = escapeHTML(canvas.ownerEmail || "");
  const updatedLabel = escapeHTML(formatDate(canvas.updatedAt));
  const canvasID = escapeHTML(canvas.id);
  const showOwner = canvas.ownerEmail && canvas.ownerEmail !== userEmail;
  const isOwner = canvas.ownerEmail === userEmail;

  return `
    <article class="group rounded-2xl border border-white/10 bg-[#020617]/60 p-3 shadow-xl shadow-black/35 transition-all duration-300 hover:scale-[1.015] hover:border-emerald-300/30 hover:shadow-emerald-500/10 ${view === "list" ? "md:flex md:items-stretch md:gap-4" : ""}">
      <button type="button" class="canvas-open-btn relative h-48 w-full overflow-hidden rounded-2xl border border-white/10 md:h-44 ${view === "list" ? "md:h-auto md:min-h-[172px] md:max-w-[320px]" : ""}" data-canvas-id="${canvasID}">
        <img src="${escapeHTML(preview)}" alt="Preview for ${title}" class="absolute inset-0 h-full w-full scale-110 object-cover blur-md transition-transform duration-500 group-hover:scale-125" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#020617]/85 via-[#020617]/45 to-[#020617]/20"></div>
        <div class="absolute inset-0 flex items-center justify-center px-5 text-center">
          <h3 class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] md:text-[1.75rem]">${title}</h3>
        </div>
      </button>

      <div class="mt-3 flex items-start justify-between gap-3 ${view === "list" ? "md:mt-0 md:flex-1" : ""}">
        <div class="space-y-1.5">
          <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badge.classes}">${badge.label}</span>
          <p class="text-xs text-slate-300">Updated ${updatedLabel}</p>
          ${showOwner ? `<p class="text-xs text-slate-400">${ownerEmail}</p>` : ""}
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="canvas-open-btn rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-emerald-300/30 hover:bg-emerald-400/10" data-canvas-id="${canvasID}">Open</button>
          ${isOwner ? `
            <button type="button" class="canvas-delete-btn rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-red-200 transition hover:border-red-300/60 hover:bg-red-500/20 hover:text-red-100" aria-label="Delete ${title}" data-canvas-id="${canvasID}">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M8.5 2a1 1 0 0 0-.95.684L7.22 4H4.5a1 1 0 1 0 0 2h.638l.8 9.208A2 2 0 0 0 7.93 17h4.14a2 2 0 0 0 1.992-1.792L14.862 6h.638a1 1 0 1 0 0-2h-2.72l-.33-1.316A1 1 0 0 0 11.5 2h-3Zm1.5 4a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Z" /></svg>
            </button>
          ` : ""}
        </div>
      </div>
    </article>
  `;
}

function CanvasGrid({ canvases, loading, userEmail, view }) {
  if (loading) {
    return `
      <div class="${view === "list" ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"}">
        ${Array.from({ length: view === "list" ? 4 : 8 }).map(() => `
          <div class="animate-pulse rounded-2xl border border-white/10 bg-[#020617]/60 p-3">
            <div class="h-44 rounded-2xl bg-white/10"></div>
            <div class="mt-3 h-4 w-2/3 rounded bg-white/10"></div>
            <div class="mt-2 h-3 w-1/2 rounded bg-white/10"></div>
          </div>
        `).join("")}
      </div>
    `;
  }

  if (!canvases.length) {
    return `
      <div class="rounded-2xl border border-white/10 bg-[#020617]/60 px-6 py-16 text-center shadow-xl shadow-black/25">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/30 to-blue-500/30 text-white">
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75h16.5v16.5H3.75V3.75Zm4.5 4.5h3v3h-3v-3Zm4.5 0h3v3h-3v-3Zm-4.5 4.5h3v3h-3v-3Zm4.5 4.5h3v3h-3v-3Z" /></svg>
        </div>
        <h2 class="mt-5 text-xl font-semibold text-white">No canvases yet</h2>
        <p class="mt-2 text-sm text-slate-400">Create your first visual board to start mapping ideas.</p>
      </div>
    `;
  }

  return `
    <div class="${view === "list" ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"}">
      ${canvases.map((canvas, index) => CanvasCard({ canvas, userEmail, index, view })).join("")}
    </div>
  `;
}

function DeleteCanvasModal({ canvasTitle, deleting }) {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" class="w-full max-w-md rounded-2xl border border-white/10 bg-[#020617] p-6 shadow-2xl">
        <h2 id="delete-modal-title" class="text-lg font-semibold text-white">Delete canvas?</h2>
        <p class="mt-2 text-sm text-slate-300">Are you sure you want to delete this canvas${canvasTitle ? `: <span class=\"font-medium text-slate-100\">${escapeHTML(canvasTitle)}</span>` : ""}? This action cannot be undone.</p>
        <div class="mt-6 flex justify-end gap-3">
          <button id="cancel-delete-btn" type="button" class="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-white/30 hover:text-white" ${deleting ? "disabled" : ""}>Cancel</button>
          <button id="confirm-delete-btn" type="button" class="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60" ${deleting ? "disabled" : ""}>${deleting ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  `;
}

function matchesFilter(canvas, userEmail, filterValue) {
  if (filterValue === "owner") {
    return canvas.ownerEmail === userEmail;
  }
  if (filterValue === "shared") {
    return (canvas.accessType || "").toLowerCase() === "shared";
  }
  if (filterValue === "private") {
    return (canvas.accessType || "").toLowerCase() === "private";
  }
  return true;
}

function sortCanvases(list, sortValue) {
  const copy = [...list];
  if (sortValue === "title_asc") {
    copy.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return copy;
  }

  copy.sort((a, b) => {
    const left = new Date(a.updatedAt).getTime() || 0;
    const right = new Date(b.updatedAt).getTime() || 0;
    return sortValue === "updated_asc" ? left - right : right - left;
  });

  return copy;
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
    onDelete,
    onLogout,
  } = options;

  const state = {
    search: "",
    searchDraft: "",
    filter: "all",
    sort: "updated_desc",
    view: "grid",
    createTitle: "",
    createAccess: "private",
    sharedEmails: [],
    shareEmailInput: "",
    joinCanvasID: "",
    deleteTargetID: "",
    deleting: false,
  };

  function cleanupEscapeHandler() {
    if (root.__dashboardEscapeHandler) {
      document.removeEventListener("keydown", root.__dashboardEscapeHandler);
      root.__dashboardEscapeHandler = null;
    }
  }

  function bindEscapeHandler() {
    cleanupEscapeHandler();
    if (!state.deleteTargetID || state.deleting) return;

    root.__dashboardEscapeHandler = (event) => {
      if (event.key !== "Escape") return;
      state.deleteTargetID = "";
      render();
    };

    document.addEventListener("keydown", root.__dashboardEscapeHandler);
  }

  function getVisibleCanvases() {
    const normalizedSearch = state.search.trim().toLowerCase();

    const filtered = canvases.filter((canvas) => {
      if (!matchesFilter(canvas, userEmail, state.filter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const inTitle = (canvas.title || "").toLowerCase().includes(normalizedSearch);
      const inOwner = (canvas.ownerEmail || "").toLowerCase().includes(normalizedSearch);
      return inTitle || inOwner;
    });

    return sortCanvases(filtered, state.sort);
  }

  function renderSharedChips() {
    if (!state.sharedEmails.length) {
      return "<p class=\"text-xs text-slate-500\">No collaborators added yet.</p>";
    }

    return state.sharedEmails.map((email) => `
      <span class="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
        ${escapeHTML(email)}
        <button type="button" class="remove-share-chip text-emerald-200 transition hover:text-white" data-email="${escapeHTML(email)}" aria-label="Remove ${escapeHTML(email)}">x</button>
      </span>
    `).join("");
  }

  function render() {
    const visibleCanvases = getVisibleCanvases();
    const deleteTargetCanvas = canvases.find((canvas) => canvas.id === state.deleteTargetID);

    root.innerHTML = `
      <main class="min-h-screen bg-gradient-to-br from-[#0B0F1A] via-[#0F172A] to-[#020617] text-slate-100">
        <div class="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          ${DashboardHeader({
            userEmail,
            search: state.searchDraft,
            filter: state.filter,
            sort: state.sort,
            view: state.view,
          })}

          <section class="mt-6 rounded-2xl border border-white/10 bg-[#020617]/60 p-4 shadow-xl shadow-black/30 backdrop-blur-xl">
            <div class="grid gap-3 lg:grid-cols-[minmax(320px,1fr)_auto_auto] lg:items-start">
              <div class="space-y-2">
                <label for="new-canvas-title" class="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Create canvas</label>
                <input
                  id="new-canvas-title"
                  type="text"
                  placeholder="New canvas name..."
                  maxlength="100"
                  value="${escapeHTML(state.createTitle)}"
                  class="w-full rounded-xl border border-white/10 bg-[#0B1220]/70 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  ${creating ? "disabled" : ""}
                />
              </div>

              <div class="space-y-2">
                <label for="new-canvas-access" class="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Privacy</label>
                <select id="new-canvas-access" class="w-full rounded-xl border border-white/10 bg-[#0B1220]/70 px-3 py-3 text-sm text-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400" ${creating ? "disabled" : ""}>
                  <option value="private" ${state.createAccess === "private" ? "selected" : ""}>Private</option>
                  <option value="shared" ${state.createAccess === "shared" ? "selected" : ""}>Shared</option>
                  <option value="public" ${state.createAccess === "public" ? "selected" : ""}>Public</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Action</label>
                <button id="create-canvas-btn" type="button" class="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-emerald-500 hover:to-blue-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60" ${creating ? "disabled" : ""}>
                  ${creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] ${state.createAccess === "shared" ? "" : "hidden"}">
              <input
                id="shared-email-input"
                type="email"
                value="${escapeHTML(state.shareEmailInput)}"
                placeholder="Add collaborator email"
                class="w-full rounded-xl border border-white/10 bg-[#0B1220]/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button id="add-shared-email-btn" type="button" class="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 transition hover:border-emerald-300/40 hover:text-white">Add person</button>
            </div>

            <div id="shared-emails-list" class="mt-3 flex flex-wrap gap-2 ${state.createAccess === "shared" ? "" : "hidden"}">
              ${renderSharedChips()}
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
              <input
                id="join-canvas-id"
                type="text"
                value="${escapeHTML(state.joinCanvasID)}"
                placeholder="Join canvas by ID"
                class="w-full rounded-xl border border-white/10 bg-[#0B1220]/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button id="join-canvas-btn" type="button" class="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 transition hover:border-emerald-300/40 hover:text-white">Join</button>
            </div>
          </section>

          ${error ? `<p class="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">${escapeHTML(error)}</p>` : ""}

          <section class="mt-6">
            ${CanvasGrid({
              canvases: visibleCanvases,
              loading,
              userEmail,
              view: state.view,
            })}
          </section>
        </div>

        ${state.deleteTargetID ? DeleteCanvasModal({
          canvasTitle: deleteTargetCanvas?.title || "",
          deleting: state.deleting,
        }) : ""}
      </main>
    `;

    bindEvents();
    bindEscapeHandler();
  }

  function bindEvents() {
    root.querySelector("#dashboard-logout-btn")?.addEventListener("click", onLogout);

    root.querySelector("#canvas-search")?.addEventListener("input", (event) => {
      state.searchDraft = event.target.value || "";
    });

    root.querySelector("#canvas-search")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      state.search = state.searchDraft.trim();
      render();
    });

    root.querySelector("#canvas-filter")?.addEventListener("change", (event) => {
      state.filter = event.target.value || "all";
      render();
    });

    root.querySelector("#canvas-sort")?.addEventListener("change", (event) => {
      state.sort = event.target.value || "updated_desc";
      render();
    });

    root.querySelector("#view-grid-btn")?.addEventListener("click", () => {
      state.view = "grid";
      render();
    });

    root.querySelector("#view-list-btn")?.addEventListener("click", () => {
      state.view = "list";
      render();
    });

    root.querySelector("#new-canvas-title")?.addEventListener("input", (event) => {
      state.createTitle = event.target.value || "";
    });

    root.querySelector("#new-canvas-title")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      root.querySelector("#create-canvas-btn")?.click();
    });

    root.querySelector("#new-canvas-access")?.addEventListener("change", (event) => {
      state.createAccess = event.target.value || "private";
      if (state.createAccess !== "shared") {
        state.sharedEmails = [];
        state.shareEmailInput = "";
      }
      render();
    });

    root.querySelector("#shared-email-input")?.addEventListener("input", (event) => {
      state.shareEmailInput = event.target.value || "";
    });

    root.querySelector("#add-shared-email-btn")?.addEventListener("click", () => {
      const email = state.shareEmailInput.trim().toLowerCase();
      if (!email) return;
      if (!email.includes("@")) {
        showToast("Enter a valid email", "error");
        return;
      }
      if (state.sharedEmails.includes(email)) {
        showToast("Collaborator already added", "error");
        return;
      }
      state.sharedEmails.push(email);
      state.shareEmailInput = "";
      render();
    });

    root.querySelectorAll(".remove-share-chip").forEach((button) => {
      button.addEventListener("click", () => {
        const targetEmail = button.dataset.email || "";
        state.sharedEmails = state.sharedEmails.filter((email) => email !== targetEmail);
        render();
      });
    });

    root.querySelector("#create-canvas-btn")?.addEventListener("click", () => {
      const title = state.createTitle.trim();
      if (!title) {
        showToast("Enter a canvas name", "error");
        return;
      }

      onCreate({
        title,
        accessType: state.createAccess,
        sharedWith: state.createAccess === "shared" ? state.sharedEmails : [],
      });
    });

    root.querySelector("#join-canvas-id")?.addEventListener("input", (event) => {
      state.joinCanvasID = event.target.value || "";
    });

    root.querySelector("#join-canvas-id")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      root.querySelector("#join-canvas-btn")?.click();
    });

    root.querySelector("#join-canvas-btn")?.addEventListener("click", () => {
      const canvasID = state.joinCanvasID.trim();
      if (!canvasID) {
        showToast("Enter a canvas ID", "error");
        return;
      }

      onOpen(canvasID);
    });

    root.querySelectorAll(".canvas-open-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const canvasID = button.dataset.canvasId;
        if (!canvasID) return;
        onOpen(canvasID);
      });
    });

    root.querySelectorAll(".canvas-delete-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const canvasID = button.dataset.canvasId;
        if (!canvasID) return;
        state.deleteTargetID = canvasID;
        state.deleting = false;
        render();
      });
    });

    root.querySelector("#cancel-delete-btn")?.addEventListener("click", () => {
      if (state.deleting) return;
      state.deleteTargetID = "";
      render();
    });

    root.querySelector("#confirm-delete-btn")?.addEventListener("click", async () => {
      if (!state.deleteTargetID || state.deleting || typeof onDelete !== "function") return;

      state.deleting = true;
      render();

      try {
        await onDelete(state.deleteTargetID);
        showToast("Canvas deleted", "success");
      } catch (error) {
        state.deleting = false;
        showToast(error?.message || "Failed to delete canvas", "error");
        render();
      }
    });
  }

  render();
}

function showToast(message, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("show"));
  });

  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 2600);
}
