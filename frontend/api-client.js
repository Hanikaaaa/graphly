const TOKEN_KEY = "pixplot_token";
const DEFAULT_API_BASE_URL = "http://localhost:8080";

export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

function resolveBaseURL() {
  const configured = window.GRAPHLY_API_BASE_URL;
  if (typeof configured === "string" && configured.trim() !== "") {
    return configured.trim().replace(/\/$/, "");
  }

  return DEFAULT_API_BASE_URL;
}

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
  } = options;

  const finalHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${resolveBaseURL()}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (response.status === 401) {
    clearAuthToken();
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed: ${response.status}`;
    throw new APIError(message, response.status, payload);
  }

  return payload;
}

export async function generateGraphFromAI(prompt) {
  const token = localStorage.getItem("token");

  const response = await fetch("/ai/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "AI generation failed");
  }

  return response.json();
}

export { TOKEN_KEY, clearAuthToken, getAuthToken };
