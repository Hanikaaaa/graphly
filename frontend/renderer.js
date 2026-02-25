import { canvas, ctx } from "./elements.js";
import * as State from "./state.js";

// Canvas Setup
export function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Clear Transform

export function clearCanvas(zoomLevel) {
  // reset transform
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // apply zoom
  ctx.setTransform(zoomLevel, 0, 0, zoomLevel, 0, 0);
}

// Grid

export function drawGrid(zoomLevel) {
  const gridSize = 14;
  const width = canvas.width / zoomLevel;
  const height = canvas.height / zoomLevel;

  ctx.strokeStyle = "#e6e6e6";
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
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

export function renderScene(nodes, connections, zoomLevel) {
  clearCanvas(zoomLevel);
  drawGrid(zoomLevel);

  const nodeMap = new Map();
nodes.forEach(n => nodeMap.set(n.id, n));

connections.forEach(conn => {
  const from = nodeMap.get(conn.from);
  const to = nodeMap.get(conn.to);
  if (!from || !to) return;

  const isSelected = conn.id === State.selectedConnectionId;
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


}
