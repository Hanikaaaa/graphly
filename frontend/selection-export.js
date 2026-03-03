import * as State from "./state.js";

function normalizeBounds(bounds) {
  if (!bounds || typeof bounds !== "object") return null;

  // Accept both {x,y,width,height} and {minX,minY,width,height}
  const x = Number.isFinite(bounds.x) ? bounds.x : bounds.minX;
  const y = Number.isFinite(bounds.y) ? bounds.y : bounds.minY;
  const width = bounds.width;
  const height = bounds.height;

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return { x, y, width, height };
}

function getCanvasScale(mainCanvas) {
  const rect = mainCanvas.getBoundingClientRect();
  const cssWidth = rect.width || mainCanvas.clientWidth || mainCanvas.width;
  const cssHeight = rect.height || mainCanvas.clientHeight || mainCanvas.height;

  if (!cssWidth || !cssHeight) {
    throw new Error("Canvas has invalid dimensions.");
  }

  const scaleX = mainCanvas.width / cssWidth;
  const scaleY = mainCanvas.height / cssHeight;
  return { scaleX, scaleY };
}

function worldToCanvasPixels(mainCanvas, bounds) {
  const { scaleX, scaleY } = getCanvasScale(mainCanvas);

  // World -> CSS viewport -> canvas backing pixels.
  const xCss = bounds.x * State.zoomLevel + State.offsetX;
  const yCss = bounds.y * State.zoomLevel + State.offsetY;
  const wCss = bounds.width * State.zoomLevel;
  const hCss = bounds.height * State.zoomLevel;

  const sx = Math.floor(xCss * scaleX);
  const sy = Math.floor(yCss * scaleY);
  const sw = Math.ceil(wCss * scaleX);
  const sh = Math.ceil(hCss * scaleY);

  return { sx, sy, sw, sh, scaleX, scaleY };
}

function clampCropToCanvas(mainCanvas, crop) {
  const x1 = Math.max(0, crop.sx);
  const y1 = Math.max(0, crop.sy);
  const x2 = Math.min(mainCanvas.width, crop.sx + crop.sw);
  const y2 = Math.min(mainCanvas.height, crop.sy + crop.sh);

  return {
    sx: x1,
    sy: y1,
    sw: Math.max(0, x2 - x1),
    sh: Math.max(0, y2 - y1),
  };
}

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function shapePath(ctx, node, x, y, w, h) {
  const shape = node.shape || "rectangle";
  ctx.beginPath();

  if (shape === "circle") {
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    return;
  }

  if (shape === "diamond") {
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x, y + h / 2);
    ctx.closePath();
    return;
  }

  if (shape === "triangle") {
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    return;
  }

  if (shape === "parallelogram") {
    ctx.moveTo(x + w * 0.2, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    return;
  }

  if (shape === "hexagon") {
    ctx.moveTo(x + w * 0.25, y);
    ctx.lineTo(x + w * 0.75, y);
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.lineTo(x + w * 0.75, y + h);
    ctx.lineTo(x + w * 0.25, y + h);
    ctx.lineTo(x, y + h * 0.5);
    ctx.closePath();
    return;
  }

  if (shape === "trapezoid") {
    ctx.moveTo(x + w * 0.2, y);
    ctx.lineTo(x + w * 0.8, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    return;
  }

  roundedRectPath(ctx, x, y, w, h, (node.borderRadius || 0) * (w / Math.max(node.width, 1)));
}

function splitToLines(ctx, text, maxWidth) {
  const lines = [];
  const words = String(text || "").split(/\s+/).filter(Boolean);

  if (!words.length) return lines;

  let line = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${line} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

async function drawNodeLayer(offscreenCtx, crop, scaleX, scaleY) {
  const zoom = State.zoomLevel;
  const offsetX = State.offsetX;
  const offsetY = State.offsetY;

  for (const node of State.nodes) {
    const x = (node.x * zoom + offsetX) * scaleX - crop.sx;
    const y = (node.y * zoom + offsetY) * scaleY - crop.sy;
    const w = node.width * zoom * scaleX;
    const h = node.height * zoom * scaleY;

    if (x + w < 0 || y + h < 0 || x > crop.sw || y > crop.sh) continue;

    offscreenCtx.save();
    offscreenCtx.globalAlpha = Number.isFinite(node.opacity) ? node.opacity : 1;

    shapePath(offscreenCtx, node, x, y, w, h);
    offscreenCtx.fillStyle = node.color || "#ffffff";
    offscreenCtx.fill();

    if (node.borderStyle !== "none") {
      shapePath(offscreenCtx, node, x, y, w, h);
      offscreenCtx.strokeStyle = node.borderColor || "rgba(59, 130, 246, 0.35)";
      offscreenCtx.lineWidth = Math.max(1, zoom * ((scaleX + scaleY) / 2));
      offscreenCtx.stroke();
    }

    // Clip text/image to node shape.
    shapePath(offscreenCtx, node, x, y, w, h);
    offscreenCtx.clip();

    if (node.image) {
      try {
        const img = new Image();
        img.src = node.image;
        await img.decode();
        offscreenCtx.drawImage(img, x, y, w, h);
      } catch {
        // Ignore decode errors and continue with text.
      }
    }

    const fontSize = Math.max(10, (node.fontSize || 14) * zoom * ((scaleX + scaleY) / 2));
    offscreenCtx.fillStyle = node.fontColor || "#0f172a";
    offscreenCtx.font = `${node.fontWeight || "normal"} ${fontSize}px "${node.fontFamily || "Courier New"}"`;
    offscreenCtx.textAlign = node.textAlign || "left";
    offscreenCtx.textBaseline = "middle";

    const padX = Math.max(8, w * 0.08);
    const padY = Math.max(8, h * 0.08);
    const textBoxX = x + padX;
    const textBoxY = y + padY;
    const textBoxW = Math.max(10, w - padX * 2);
    const textBoxH = Math.max(10, h - padY * 2);

    const lines = splitToLines(offscreenCtx, node.text || "", textBoxW);
    const lineHeight = fontSize * 1.35;
    const totalHeight = lines.length * lineHeight;
    let cursorY = textBoxY + Math.max(lineHeight / 2, (textBoxH - totalHeight) / 2 + lineHeight / 2);
    const textX =
      (node.textAlign || "left") === "center"
        ? textBoxX + textBoxW / 2
        : (node.textAlign || "left") === "right"
          ? textBoxX + textBoxW
          : textBoxX;

    for (const line of lines) {
      if (cursorY > textBoxY + textBoxH) break;
      offscreenCtx.fillText(line, textX, cursorY);
      cursorY += lineHeight;
    }

    offscreenCtx.restore();
  }
}

async function createSelectionOffscreenCanvas(mainCanvas, bounds) {
  if (!(mainCanvas instanceof HTMLCanvasElement)) {
    throw new Error("mainCanvas must be an HTMLCanvasElement.");
  }

  const normalizedBounds = normalizeBounds(bounds);
  if (!normalizedBounds) {
    throw new Error("Invalid bounds: expected finite x/y/width/height with positive size.");
  }

  if (!Number.isFinite(State.zoomLevel) || State.zoomLevel <= 0) {
    throw new Error("Invalid viewport zoom.");
  }

  const rawCrop = worldToCanvasPixels(mainCanvas, normalizedBounds);
  const crop = clampCropToCanvas(mainCanvas, rawCrop);

  if (crop.sw <= 0 || crop.sh <= 0) {
    throw new Error("Selection is empty or outside visible canvas.");
  }

  const offscreen = document.createElement("canvas");
  offscreen.width = crop.sw;
  offscreen.height = crop.sh;

  const ctx = offscreen.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create 2D context for offscreen export canvas.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    mainCanvas,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    crop.sw,
    crop.sh,
  );

  await drawNodeLayer(offscreen.getContext("2d"), crop, rawCrop.scaleX, rawCrop.scaleY);
  return { offscreen, crop, rawCrop };
}

function canvasToBlob(canvas, type = "image/png", quality = 1) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to produce export blob."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

// Export selected world region as PNG.
export async function exportSelectionAsImage(mainCanvas, bounds) {
  const { offscreen } = await createSelectionOffscreenCanvas(mainCanvas, bounds);
  return canvasToBlob(offscreen, "image/png", 1);
}

// Export selected world region as PDF using jsPDF.
export async function exportSelectionAsPDF(mainCanvas, bounds) {
  const jsPDFCtor = globalThis.jspdf?.jsPDF || globalThis.jsPDF;
  if (typeof jsPDFCtor !== "function") {
    throw new Error(
      "jsPDF is not available. Ensure jspdf.umd.min.js is loaded before exporting PDF.",
    );
  }

  const { offscreen } = await createSelectionOffscreenCanvas(mainCanvas, bounds);

  // Convert CSS pixels to PDF points (96px = 72pt) and keep valid minimum size.
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const pdfWidthPt = Math.max(1, (offscreen.width / dpr) * 0.75);
  const pdfHeightPt = Math.max(1, (offscreen.height / dpr) * 0.75);
  const orientation = pdfWidthPt >= pdfHeightPt ? "landscape" : "portrait";

  const pdf = new jsPDFCtor({
    orientation,
    unit: "pt",
    format: [pdfWidthPt, pdfHeightPt],
    compress: true,
  });

  // Prefer canvas source directly (more compatible); fallback to data URL if needed.
  try {
    pdf.addImage(offscreen, "PNG", 0, 0, pdfWidthPt, pdfHeightPt);
  } catch (_error) {
    const imgData = offscreen.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidthPt, pdfHeightPt);
  }

  return pdf.output("blob");
}

