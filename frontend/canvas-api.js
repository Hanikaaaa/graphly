import { apiRequest } from "./api-client.js";

export async function listCanvases() {
  const response = await apiRequest("/canvases", {
    method: "GET",
    auth: true,
  });

  return Array.isArray(response) ? response : [];
}

export async function createCanvas(title = "") {
  return apiRequest("/canvases", {
    method: "POST",
    auth: true,
    body: { title },
  });
}

export async function getCanvasByID(canvasID) {
  return apiRequest(`/canvases/${encodeURIComponent(canvasID)}`, {
    method: "GET",
    auth: true,
  });
}

export async function saveCanvasData(canvasID, data) {
  return apiRequest(`/canvases/${encodeURIComponent(canvasID)}`, {
    method: "PUT",
    auth: true,
    body: { data },
  });
}
