import { canvas as mainCanvas } from "./elements.js";
import * as State from "./state.js";

const minimapRoot = document.getElementById("minimap");
const minimapCanvas = document.getElementById("minimap-canvas");
const minimapCtx = minimapCanvas?.getContext("2d") || null;

let isInitialized = false;
let navigateCallback = null;
let activePointerId = null;
let currentTransform = null;

function resizeMinimapCanvas() {
  if (!minimapCanvas || !minimapRoot) return;

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = minimapCanvas.getBoundingClientRect();
  const targetWidth = Math.max(1, Math.round(rect.width * dpr));
  const targetHeight = Math.max(1, Math.round(rect.height * dpr));

  if (minimapCanvas.width !== targetWidth || minimapCanvas.height !== targetHeight) {
    minimapCanvas.width = targetWidth;
    minimapCanvas.height = targetHeight;
  }
}

function getViewportBoundsWorld() {
  const zoom = Math.max(0.01, State.zoomLevel || 1);
  const minX = -State.offsetX / zoom;
  const minY = -State.offsetY / zoom;
  const maxX = minX + mainCanvas.width / zoom;
  const maxY = minY + mainCanvas.height / zoom;
  return { minX, minY, maxX, maxY };
}

function getContentBoundsWorld() {
  const viewport = getViewportBoundsWorld();

  if (!State.nodes.length) {
    return viewport;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  State.nodes.forEach((node) => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  });

  minX = Math.min(minX, viewport.minX);
  minY = Math.min(minY, viewport.minY);
  maxX = Math.max(maxX, viewport.maxX);
  maxY = Math.max(maxY, viewport.maxY);

  const margin = Math.max((maxX - minX) * 0.07, (maxY - minY) * 0.07, 80);
  return {
    minX: minX - margin,
    minY: minY - margin,
    maxX: maxX + margin,
    maxY: maxY + margin,
  };
}

function buildTransform() {
  if (!minimapCanvas || !minimapCtx) return null;

  const bounds = getContentBoundsWorld();
  const width = minimapCanvas.width;
  const height = minimapCanvas.height;
  const padding = 10 * Math.max(1, window.devicePixelRatio || 1);

  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);

  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  const scale = Math.min(usableWidth / worldWidth, usableHeight / worldHeight);

  return {
    bounds,
    padding,
    scale,
    width,
    height,
    worldToMapX: (worldX) => padding + (worldX - bounds.minX) * scale,
    worldToMapY: (worldY) => padding + (worldY - bounds.minY) * scale,
    mapToWorldX: (mapX) => bounds.minX + (mapX - padding) / scale,
    mapToWorldY: (mapY) => bounds.minY + (mapY - padding) / scale,
  };
}

function navigateToPointer(event) {
  if (!minimapCanvas || !currentTransform) return;

  const rect = minimapCanvas.getBoundingClientRect();
  const dpr = minimapCanvas.width / Math.max(1, rect.width);
  const mapX = (event.clientX - rect.left) * dpr;
  const mapY = (event.clientY - rect.top) * dpr;

  const worldX = currentTransform.mapToWorldX(mapX);
  const worldY = currentTransform.mapToWorldY(mapY);
  const zoom = Math.max(0.01, State.zoomLevel || 1);

  const nextOffsetX = mainCanvas.width * 0.5 - worldX * zoom;
  const nextOffsetY = mainCanvas.height * 0.5 - worldY * zoom;
  State.setOffset(nextOffsetX, nextOffsetY);
  navigateCallback?.();
}

function handlePointerDown(event) {
  if (!minimapCanvas) return;
  event.preventDefault();
  event.stopPropagation();
  activePointerId = event.pointerId;
  minimapCanvas.setPointerCapture(event.pointerId);
  navigateToPointer(event);
}

function handlePointerMove(event) {
  if (event.pointerId !== activePointerId) return;
  navigateToPointer(event);
}

function handlePointerUp(event) {
  if (!minimapCanvas) return;
  if (event.pointerId !== activePointerId) return;
  activePointerId = null;
  minimapCanvas.releasePointerCapture(event.pointerId);
}

export function initMiniMap(options = {}) {
  if (!minimapRoot || !minimapCanvas || !minimapCtx) return;
  navigateCallback =
    typeof options.onNavigate === "function" ? options.onNavigate : null;

  if (isInitialized) return;
  isInitialized = true;

  resizeMinimapCanvas();
  minimapCanvas.addEventListener("pointerdown", handlePointerDown);
  minimapCanvas.addEventListener("pointermove", handlePointerMove);
  minimapCanvas.addEventListener("pointerup", handlePointerUp);
  minimapCanvas.addEventListener("pointercancel", handlePointerUp);
}

export function renderMiniMap() {
  if (!minimapRoot || !minimapCanvas || !minimapCtx) return;

  resizeMinimapCanvas();
  currentTransform = buildTransform();
  if (!currentTransform) return;

  const { worldToMapX, worldToMapY } = currentTransform;
  const viewport = getViewportBoundsWorld();

  minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  minimapCtx.fillStyle = "rgba(3, 10, 24, 0.92)";
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  if (State.connections.length) {
    minimapCtx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    minimapCtx.lineWidth = 1;
    State.connections.forEach((conn) => {
      const from = State.getNodeById(conn.from);
      const to = State.getNodeById(conn.to);
      if (!from || !to) return;

      const fromX = worldToMapX(from.x + from.width * 0.5);
      const fromY = worldToMapY(from.y + from.height * 0.5);
      const toX = worldToMapX(to.x + to.width * 0.5);
      const toY = worldToMapY(to.y + to.height * 0.5);

      minimapCtx.beginPath();
      minimapCtx.moveTo(fromX, fromY);
      minimapCtx.lineTo(toX, toY);
      minimapCtx.stroke();
    });
  }

  State.nodes.forEach((node) => {
    const x = worldToMapX(node.x);
    const y = worldToMapY(node.y);
    const w = Math.max(2, node.width * currentTransform.scale);
    const h = Math.max(2, node.height * currentTransform.scale);
    const isSelected = State.selectedNodeIds.has(node.id);

    minimapCtx.fillStyle = isSelected
      ? "rgba(251, 146, 60, 0.9)"
      : "rgba(52, 211, 153, 0.9)";
    minimapCtx.fillRect(x, y, w, h);
  });

  const viewportX = worldToMapX(viewport.minX);
  const viewportY = worldToMapY(viewport.minY);
  const viewportW = Math.max(8, (viewport.maxX - viewport.minX) * currentTransform.scale);
  const viewportH = Math.max(8, (viewport.maxY - viewport.minY) * currentTransform.scale);

  minimapCtx.fillStyle = "rgba(59, 130, 246, 0.16)";
  minimapCtx.fillRect(viewportX, viewportY, viewportW, viewportH);
  minimapCtx.strokeStyle = "rgba(125, 211, 252, 0.95)";
  minimapCtx.lineWidth = 2;
  minimapCtx.strokeRect(viewportX, viewportY, viewportW, viewportH);
}
