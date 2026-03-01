import { apiRequest, TOKEN_KEY, clearAuthToken, getAuthToken } from "./api-client.js";

export { TOKEN_KEY };

export function hasToken() {
  return Boolean(getAuthToken());
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  clearAuthToken();
  window.location.replace("/login");
}

export async function register(email, password) {
  const response = await apiRequest("/auth/register", {
    method: "POST",
    auth: false,
    body: { email, password },
  });

  if (!response?.token) {
    throw new Error("Token missing in register response");
  }

  saveToken(response.token);
  window.location.replace("/app");
  return response;
}

export async function login(email, password) {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });

  if (!response?.token) {
    throw new Error("Token missing in login response");
  }

  saveToken(response.token);
  window.location.replace("/app");
  return response;
}

export async function getCurrentUser() {
  const response = await apiRequest("/auth/me", {
    method: "GET",
    auth: true,
  });

  return response?.user ?? null;
}
