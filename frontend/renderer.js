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
  ctx.setTransform(zoomLevel, 0, 0, zoomLevel, State.offsetX, State.offsetY);
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

function getConnectionCurvePoints(fromX, fromY, toX, toY) {
  return {
    fromX,
    fromY,
    toX,
    toY,
    controlX: fromX,
    controlY: (fromY + toY) / 2,
  };
}

function getQuadraticPointAt(curve, t) {
  const oneMinusT = 1 - t;
  return {
    x:
      oneMinusT * oneMinusT * curve.fromX +
      2 * oneMinusT * t * curve.controlX +
      t * t * curve.toX,
    y:
      oneMinusT * oneMinusT * curve.fromY +
      2 * oneMinusT * t * curve.controlY +
      t * t * curve.toY,
  };
}

export function getConnectionMidpoint(fromX, fromY, toX, toY) {
  const curve = getConnectionCurvePoints(fromX, fromY, toX, toY);
  return getQuadraticPointAt(curve, 0.5);
}

function isPointInsideNode(node, point, pad = 8) {
  return (
    point.x >= node.x - pad &&
    point.x <= node.x + node.width + pad &&
    point.y >= node.y - pad &&
    point.y <= node.y + node.height + pad
  );
}

function isScreenPointVisible(screenPoint, margin = 16) {
  return (
    screenPoint.x >= margin &&
    screenPoint.x <= canvas.width - margin &&
    screenPoint.y >= margin &&
    screenPoint.y <= canvas.height - margin
  );
}

function boxesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function getNodeScreenBox(node, zoomLevel) {
  return {
    x: node.x * zoomLevel + State.offsetX,
    y: node.y * zoomLevel + State.offsetY,
    width: node.width * zoomLevel,
    height: node.height * zoomLevel,
  };
}

function estimateLabelScreenBox(anchorWorldPoint, zoomLevel, label, labelFontSize) {
  const screenPoint = toScreenPoint(anchorWorldPoint.x, anchorWorldPoint.y, zoomLevel);
  const fontSize = Math.max(10, Number(labelFontSize) || 14) * zoomLevel;
  ctx.font = `${fontSize}px "Courier New", monospace`;
  const textWidth = ctx.measureText(label).width;
  const padX = 9;
  const padY = 5;
  const shiftedY = screenPoint.y - 12;

  return {
    x: screenPoint.x - (textWidth + padX * 2) / 2,
    y: shiftedY - (fontSize * 0.95 + padY * 2) / 2,
    width: textWidth + padX * 2,
    height: fontSize * 0.95 + padY * 2,
  };
}

function isLabelBoxClearOfNodes(labelBox, allNodes, zoomLevel, fromId, toId) {
  return allNodes.every((node) => {
    if (node.id === fromId || node.id === toId) return true;
    return !boxesOverlap(labelBox, getNodeScreenBox(node, zoomLevel));
  });
}

function getVisibleLabelAnchor(allNodes, from, to, zoomLevel, label, labelFontSize) {
  const fromCenter = getNodeCenter(from);
  const toCenter = getNodeCenter(to);
  const curve = getConnectionCurvePoints(
    fromCenter.x,
    fromCenter.y,
    toCenter.x,
    toCenter.y,
  );
  const candidates = [0.5, 0.42, 0.58, 0.35, 0.65, 0.28, 0.72, 0.2, 0.8];

  for (const t of candidates) {
    const worldPoint = getQuadraticPointAt(curve, t);
    if (isPointInsideNode(from, worldPoint) || isPointInsideNode(to, worldPoint)) {
      continue;
    }

    const screenPoint = toScreenPoint(worldPoint.x, worldPoint.y, zoomLevel);
    if (!isScreenPointVisible(screenPoint)) continue;
    const labelBox = estimateLabelScreenBox(
      worldPoint,
      zoomLevel,
      label,
      labelFontSize,
    );
    if (
      !isScreenPointVisible({ x: labelBox.x, y: labelBox.y }, 0) ||
      !isScreenPointVisible(
        { x: labelBox.x + labelBox.width, y: labelBox.y + labelBox.height },
        0,
      )
    ) {
      continue;
    }
    if (!isLabelBoxClearOfNodes(labelBox, allNodes, zoomLevel, from.id, to.id)) {
      continue;
    }

    return worldPoint;
  }

  return null;
}

function toScreenPoint(worldX, worldY, zoomLevel) {
  return {
    x: worldX * zoomLevel + State.offsetX,
    y: worldY * zoomLevel + State.offsetY,
  };
}

function fitLabelTextToWidth(label, maxWidthPx) {
  if (!label) return "";
  if (ctx.measureText(label).width <= maxWidthPx) return label;

  let visibleChars = label.length;
  while (visibleChars > 0) {
    const candidate = `${label.slice(0, visibleChars)}...`;
    if (ctx.measureText(candidate).width <= maxWidthPx) return candidate;
    visibleChars -= 1;
  }

  return "...";
}

function drawConnectionLabel(
  label,
  midpoint,
  zoomLevel,
  labelFontSize,
  isSelected = false,
  isHovered = false,
) {
  if (!label) return;

  const HOVER_SCALE = 1.22;
  const sizeScale = isHovered ? HOVER_SCALE : 1;
  const screenPoint = toScreenPoint(midpoint.x, midpoint.y, zoomLevel);
  const shiftedY = screenPoint.y - 12 * sizeScale;

  // Keep label typography aligned with node text: base size is configurable per connector,
  // and rendered size follows zoom like node text does.
  const baseWorldFont = Math.max(10, Number(labelFontSize) || 14);
  const fontSize = baseWorldFont * zoomLevel * sizeScale;
  ctx.font = `${fontSize}px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxLabelWidth = isHovered ? Number.POSITIVE_INFINITY : 180 * zoomLevel;
  const labelToRender = fitLabelTextToWidth(label, maxLabelWidth);
  const metrics = ctx.measureText(labelToRender);
  const textWidth = metrics.width;
  const padX = 9 * sizeScale;
  const padY = 5 * sizeScale;
  const textHeight = fontSize * 0.95;
  const bgWidth = textWidth + padX * 2;
  const bgHeight = textHeight + padY * 2;
  const bgX = screenPoint.x - bgWidth / 2;
  const bgY = shiftedY - bgHeight / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

  ctx.strokeStyle = isSelected || isHovered ? "#ff7a00" : "rgba(15, 23, 42, 0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);

  ctx.fillStyle = isHovered ? "#7c2d12" : "#0f172a";
  ctx.fillText(labelToRender, screenPoint.x, shiftedY);
}

export function drawBezier(fromX, fromY, toX, toY, style, isSelected = false) {
  const curve = getConnectionCurvePoints(fromX, fromY, toX, toY);

  ctx.save();
  if (isSelected) {
    ctx.setLineDash([]);
    ctx.strokeStyle = "#ff7a00";
    ctx.lineWidth = style.width + 4;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(curve.controlX, curve.controlY, toX, toY);
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
  ctx.quadraticCurveTo(curve.controlX, curve.controlY, toX, toY);
  ctx.stroke();
  ctx.restore();
}

export function drawConnection(fromNode, toNode) {
  if (!fromNode || !toNode) return;

  const from = getNodeCenter(fromNode);
  const to = getNodeCenter(toNode);

  drawBezier(from.x, from.y, to.x, to.y, {
    color: fromNode.connectorColor || "#444",
    width: fromNode.connectorWidth || 3,
  });
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
  drawBezier(fromX, fromY, toX, toY, {
    color: "#7d7cbd",
    width: 2,
  });
}

// Full scene Render

export function renderScene(
  nodes,
  connections,
  zoomLevel,
  marquee = null,
  connectionPreview = null,
) {
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

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const connectionLabels = [];

  connections.forEach((conn) => {
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
      isSelected,
    );

    if (typeof conn.label === "string" && conn.label.trim()) {
      const labelFontSize = conn.labelFontSize || from.fontSize || 14;
      const labelAnchor = getVisibleLabelAnchor(
        nodes,
        from,
        to,
        zoomLevel,
        conn.label.trim(),
        labelFontSize,
      );
      if (!labelAnchor) return;

      connectionLabels.push({
        id: conn.id,
        label: conn.label.trim(),
        labelFontSize,
        midpoint: labelAnchor,
        isSelected,
      });
    }
  });

  if (connectionLabels.length) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    connectionLabels.forEach(
      ({ id, label, labelFontSize, midpoint, isSelected }) => {
      drawConnectionLabel(
        label,
        midpoint,
        zoomLevel,
        labelFontSize,
        isSelected,
        State.hoveredConnectionId === id,
      );
      },
    );
    ctx.restore();
  }

  if (connectionPreview) {
    const sourceNode = nodes.find((n) => n.id === connectionPreview.sourceId);

    if (sourceNode) {
      const fromX = sourceNode.x + sourceNode.width / 2;

      const fromY = sourceNode.y + sourceNode.height / 2;

      const toX = (connectionPreview.currentX - State.offsetX) / zoomLevel;

      const toY = (connectionPreview.currentY - State.offsetY) / zoomLevel;

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
      [maxX, maxY], // bottom-right
    ];

    ctx.save();
    ctx.fillStyle = "#4f46e5";

    handles.forEach(([x, y]) => {
      ctx.fillRect(
        x - handleSize / 2,
        y - handleSize / 2,
        handleSize,
        handleSize,
      );
    });

    ctx.restore();
  }

  if (marquee) {
    const { startX, startY, currentX, currentY } = marquee;

    const worldStartX = (startX - State.offsetX) / zoomLevel;
    const worldStartY = (startY - State.offsetY) / zoomLevel;

    const worldCurrentX = (currentX - State.offsetX) / zoomLevel;
    const worldCurrentY = (currentY - State.offsetY) / zoomLevel;

    const minX = Math.min(worldStartX, worldCurrentX);
    const minY = Math.min(worldStartY, worldCurrentY);
    const width = Math.abs(worldCurrentX - worldStartX);
    const height = Math.abs(worldCurrentY - worldStartY);

    drawMarquee(minX, minY, width, height, zoomLevel);
  }
}
