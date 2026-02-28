import { canvas, ctx } from "./elements.js";
import * as State from "./state.js";
import { getSelectionBounds } from "./geometry/bounds.js";

// Canvas Setup
export function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Clear Transform

export function clearCanvas(zoomLevel) {
  // reset transform
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = State.background.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // apply zoom
  ctx.setTransform(
    zoomLevel,
    0,
    0,
    zoomLevel,
    State.offsetX,
    State.offsetY
  );
}

// Grid

export function drawGrid(zoomLevel) {
  ctx.save();
  const spacing = State.background.gridSpacing;

  const startWorldX = -State.offsetX / zoomLevel;
  const startWorldY = -State.offsetY / zoomLevel;

  const endWorldX = startWorldX + canvas.width / zoomLevel;
  const endWorldY = startWorldY + canvas.height / zoomLevel;

  const firstX = Math.floor(startWorldX / spacing) * spacing;
  const firstY = Math.floor(startWorldY / spacing) * spacing;

  ctx.strokeStyle = State.background.gridColor;
  ctx.globalAlpha = State.background.gridOpacity;
  ctx.lineWidth = State.background.gridLineWidth / zoomLevel;
  ctx.translate(0.5 / zoomLevel, 0.5 / zoomLevel);
  for (let x = firstX; x < endWorldX; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, startWorldY);
    ctx.lineTo(x, endWorldY);
    ctx.stroke();
  }

  for (let y = firstY; y < endWorldY; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(startWorldX, y);
    ctx.lineTo(endWorldX, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawDots(zoomLevel) {
  ctx.save();
  const spacing = State.background.dotSpacing;
  const radius = State.background.dotRadius / zoomLevel;
  ctx.globalAlpha = State.background.dotOpacity;

  const startWorldX = -State.offsetX / zoomLevel;
  const startWorldY = -State.offsetY / zoomLevel;

  const endWorldX = startWorldX + canvas.width / zoomLevel;
  const endWorldY = startWorldY + canvas.height / zoomLevel;

  const firstX = Math.floor(startWorldX / spacing) * spacing;
  const firstY = Math.floor(startWorldY / spacing) * spacing;

  ctx.fillStyle = State.background.dotColor;

  for (let x = firstX; x < endWorldX; x += spacing) {
    for (let y = firstY; y < endWorldY; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Connection Drawing

function getNodeCenter(node) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

export function drawBezier(fromX, fromY, toX, toY, style, isSelected = false) {
  const controlY = (fromY + toY) / 2;

  ctx.save();
  if (isSelected) {
    ctx.setLineDash([]);
    ctx.strokeStyle = "#ff7a00";
    ctx.lineWidth = style.width + 4;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(fromX, controlY, toX, toY);
    ctx.stroke();
  }

  // Line style
  if (style.type === "dashed") {
    ctx.setLineDash([16, 10]);
  } else if (style.type === "dotted") {
    ctx.setLineDash([3, 10]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo(fromX, controlY, toX, toY);
  ctx.stroke();
  ctx.restore();
}

export function drawConnection(fromNode, toNode) {
  if (!fromNode || !toNode) return;

  const from = getNodeCenter(fromNode);
  const to = getNodeCenter(toNode);

  drawBezier(
    from.x,
    from.y,
    to.x,
    to.y,
    {
      color: fromNode.connectorColor || "#444",
      width: fromNode.connectorWidth || 3,
    }
  );
}

export function drawMarquee(minX, minY, width, height, zoomLevel) {
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "#4f46e5";
  ctx.lineWidth = 1 / zoomLevel;
  ctx.strokeRect(minX, minY, width, height);
  ctx.restore();
}

// Preview Connection

export function drawConnectionPreview(fromX, fromY, toX, toY) {
  drawBezier(
    fromX,
    fromY,
    toX,
    toY,
    {
      color: "#7d7cbd",
      width: 2,
    }
  );
}

// Full scene Render

export function renderScene(nodes, connections, zoomLevel, marquee = null, connectionPreview = null) {
  clearCanvas(zoomLevel);
  switch (State.background.type) {
  case "grid":
    drawGrid(zoomLevel);
    break;
  case "dots":
    drawDots(zoomLevel);
    break;
  case "none":
  default:
    break;
}

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

connections.forEach(conn => {
  const from = nodeMap.get(conn.from);
  const to = nodeMap.get(conn.to);
  if (!from || !to) return;

  const isSelected = State.selectedConnectionIds.has(conn.id);
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  drawBezier(
    fromX,
    fromY,
    toX,
    toY,
    {
      color: conn.color,
      width: conn.width,
      type: conn.style,
    },
    isSelected
  );
});

if (connectionPreview) {

  const sourceNode = nodes.find(
    n => n.id === connectionPreview.sourceId
  );

  if (sourceNode) {

    const fromX =
      sourceNode.x + sourceNode.width / 2;

    const fromY =
      sourceNode.y + sourceNode.height / 2;

    const toX =
      (connectionPreview.currentX - State.offsetX) / zoomLevel;

    const toY =
      (connectionPreview.currentY - State.offsetY) / zoomLevel;

    drawConnectionPreview(fromX, fromY, toX, toY);
  }
}

const groupBounds = getSelectionBounds(nodes, State.selectedNodeIds);

if (groupBounds) {

  const { minX, minY, width, height, maxX, maxY } = groupBounds;

  // Draw dashed bounding box
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "#4f46e5";
  ctx.lineWidth = 1 / zoomLevel;
  ctx.strokeRect(minX, minY, width, height);
  ctx.restore();

  // Draw resize handles
  const handleSize = 10 / zoomLevel;

  const handles = [
    [minX, minY], // top-left
    [maxX, minY], // top-right
    [minX, maxY], // bottom-left
    [maxX, maxY]  // bottom-right
  ];

  ctx.save();
  ctx.fillStyle = "#4f46e5";

  handles.forEach(([x, y]) => {
    ctx.fillRect(
      x - handleSize / 2,
      y - handleSize / 2,
      handleSize,
      handleSize
    );
  });

  ctx.restore();
}

if (marquee) {
  const { startX, startY, currentX, currentY } = marquee;

  const worldStartX =
    (startX - State.offsetX) / zoomLevel;
  const worldStartY =
    (startY - State.offsetY) / zoomLevel;

  const worldCurrentX =
    (currentX - State.offsetX) / zoomLevel;
  const worldCurrentY =
    (currentY - State.offsetY) / zoomLevel;

  const minX = Math.min(worldStartX, worldCurrentX);
  const minY = Math.min(worldStartY, worldCurrentY);
  const width = Math.abs(worldCurrentX - worldStartX);
  const height = Math.abs(worldCurrentY - worldStartY);

  drawMarquee(minX, minY, width, height, zoomLevel);
}

}
