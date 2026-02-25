import { login, register } from "./auth.js";

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderAuthScreen(root, { onAuthenticated }) {
  const state = {
    mode: "login",
    loading: false,
    error: "",
  };

  function render() {
    const isLogin = state.mode === "login";

    root.innerHTML = `
      <main class="landing-shell">
        <section class="auth-card">
          <h1>Graphly</h1>
          <p class="subtitle">Collaborative mind mapping for teams.</p>
          <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button type="button" class="tab-btn ${isLogin ? "active" : ""}" data-mode="login">Login</button>
            <button type="button" class="tab-btn ${!isLogin ? "active" : ""}" data-mode="register">Register</button>
          </div>

          <form id="auth-form" class="auth-form" novalidate>
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" required ${state.loading ? "disabled" : ""} />

            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" minlength="8" required ${state.loading ? "disabled" : ""} />

            <button type="submit" class="primary-btn" ${state.loading ? "disabled" : ""}>
              ${state.loading ? "Please wait..." : isLogin ? "Login" : "Create account"}
            </button>
          </form>

          <p class="error-text" ${state.error ? "" : "hidden"}>${escapeHTML(state.error)}</p>
        </section>
      </main>
    `;

    root.querySelectorAll(".tab-btn").forEach((button) => {
      button.addEventListener("click", () => {
        if (state.loading) return;
        const nextMode = button.dataset.mode;
        if (!nextMode || nextMode === state.mode) return;
        state.mode = nextMode;
        state.error = "";
        render();
      });
    });

    const form = root.querySelector("#auth-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (state.loading) {
        return;
      }

      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      if (!email || !password) {
        state.error = "Email and password are required.";
        render();
        return;
      }

      state.loading = true;
      state.error = "";
      render();

      try {
        if (state.mode === "login") {
          await login(email, password);
        } else {
          await register(email, password);
        }

        await onAuthenticated();
      } catch (error) {
        state.loading = false;
        state.error = error?.message || "Authentication failed.";
        render();
      }
    });
  }

  render();
}

export function renderDashboard(root, { user, onLogout }) {
  root.innerHTML = `
    <main class="landing-shell">
      <section class="dashboard-card">
        <h1>Welcome to Graphly</h1>
        <p>You are signed in as <strong>${escapeHTML(user?.email || "unknown")}</strong>.</p>
        <p class="subtitle">Dashboard placeholder ready. Canvas, WebSocket, and autosave are intentionally disabled here.</p>
        <button id="logout-btn" class="secondary-btn" type="button">Logout</button>
      </section>
    </main>
  `;

  const logoutButton = root.querySelector("#logout-btn");
  logoutButton.addEventListener("click", () => onLogout());
}

export function renderLoading(root, message = "Loading...") {
  root.innerHTML = `
    <main class="landing-shell">
      <section class="dashboard-card compact">
        <p>${escapeHTML(message)}</p>
      </section>
    </main>
  `;
}
