import { apiRequest } from "./api-client.js";

export async function listCanvases() {
  const response = await apiRequest("/canvases", {
    method: "GET",
    auth: true,
  });

  return Array.isArray(response) ? response : [];
}

export async function createCanvas(title = "Untitled Canvas", accessType = "private", sharedWith=[]) {
  console.log("createCanvas:", { title, accessType, sharedWith });
  return apiRequest("/canvases", {
    method: "POST",
    auth: true,
    body: { 
      title: title || "Untitled Canvas",
      accessType,
      sharedWith
    },
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

export async function deleteCanvas(canvasID) {
  return apiRequest(`/canvases/${encodeURIComponent(canvasID)}`, {
    method: "DELETE",
    auth: true,
  });
}
