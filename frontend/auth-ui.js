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
  const path = window.location.pathname;

  const state = {
    mode: path.startsWith("/signup") ? "register" : "login",
    loading: false,
    error: "",
  };

  function render() {
    const isLogin = state.mode === "login";

    root.innerHTML = `
      <main
        class="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B0F1A] via-[#0F172A] to-[#020617] p-4 sm:p-6"
        style="background:
          radial-gradient(circle at 12% 18%, rgba(52, 245, 197, 0.12), transparent 34%),
          radial-gradient(circle at 84% 11%, rgba(79, 140, 255, 0.16), transparent 40%),
          #081c3a;">
          
        <a href="/" class="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#020617]/40 px-3 py-2 text-sm font-medium text-gray-300 backdrop-blur-md transition-all hover:border-emerald-400/40 hover:text-white hover:shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Back
        </a>
        <div aria-hidden="true" class="pointer-events-none absolute left-8 top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl"></div>
        <div aria-hidden="true" class="pointer-events-none absolute bottom-12 right-8 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"></div>
        <section class="group grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-[#020617]/60 shadow-2xl backdrop-blur-xl md:grid-cols-2">
          <div class="relative block min-h-[320px] md:min-h-full">
            <img
              src="/assets/graphly02.png"
              alt="Graphly collaboration workspace"
              class="absolute inset-0 h-full w-full object-cover"
            />
            
          </div>

          <div class="space-y-5 p-8 md:p-10">
            <div>
              <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                Graphly
              </h1>
              <p class="mt-2 text-sm text-gray-300">
                Secure access to your collaborative canvas.
              </p>
            </div>

            <div class="flex rounded-full border border-white/10 bg-[#0B1220]/70 p-1" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                class="tab-btn flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  isLogin
                    ? "bg-gradient-to-r from-emerald-400 to-blue-500 text-white shadow-lg shadow-emerald-500/25"
                    : "text-gray-500 hover:text-gray-300"
                }"
                data-mode="login"
              >
                Login
              </button>
              <button
                type="button"
                class="tab-btn flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  !isLogin
                    ? "bg-gradient-to-r from-emerald-400 to-blue-500 text-white shadow-lg shadow-emerald-500/25"
                    : "text-gray-500 hover:text-gray-300"
                }"
                data-mode="register"
              >
                Register
              </button>
            </div>

            <form id="auth-form" class="auth-form space-y-4" novalidate>
              <div class="space-y-2">
                <label for="email" class="block text-sm font-medium text-gray-200">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="w-full rounded-xl border border-white/10 bg-[#020617]/60 px-4 py-3 text-sm text-white placeholder:text-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="you@company.com"
                  ${state.loading ? "disabled" : ""}
                />
              </div>

              <div class="space-y-2">
                <label for="password" class="block text-sm font-medium text-gray-200">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  minlength="8"
                  required
                  class="w-full rounded-xl border border-white/10 bg-[#020617]/60 px-4 py-3 text-sm text-white placeholder:text-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Enter your password"
                  ${state.loading ? "disabled" : ""}
                />
              </div>

              <button
                type="submit"
                class="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-blue-500 py-3 font-semibold text-white transition-all duration-200 hover:from-emerald-500 hover:to-blue-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                ${state.loading ? "disabled" : ""}
              >
                ${state.loading ? "Please wait..." : isLogin ? "Login" : "Create account"}
              </button>
            </form>

            <p class="error-text rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" ${state.error ? "" : "hidden"}>
              ${escapeHTML(state.error)}
            </p>
          </div>
        </section>
      </main>
    `;

    root.querySelectorAll(".tab-btn").forEach((button) => {
      button.addEventListener("click", () => {
        if (state.loading) return;
        const nextMode = button.dataset.mode;
        if (!nextMode || nextMode === state.mode) return;
        const nextPath = nextMode === "login" ? "/login" : "/signup";
        window.history.pushState({}, "", nextPath);
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



// <div class="absolute inset-0 bg-gradient-to-br from-[#020617]/70 via-[#020617]/40 to-transparent"></div>
            // <div class="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"></div>
            // <div class="absolute bottom-6 left-6 text-5xl font-extrabold tracking-tight text-white/10">Graphly</div>
