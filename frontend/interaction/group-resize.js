export function applyGroupResize(interaction, e, State) {
  const dx = (e.clientX - interaction.startX) / State.zoomLevel;
  const dy = (e.clientY - interaction.startY) / State.zoomLevel;

  const original = interaction.groupBounds;

  let newMinX = original.minX;
  let newMinY = original.minY;
  let newMaxX = original.maxX;
  let newMaxY = original.maxY;

  switch (interaction.groupResizeHandle) {
    case "br":
      newMaxX += dx;
      newMaxY += dy;
      break;
    case "tr":
      newMaxX += dx;
      newMinY += dy;
      break;
    case "bl":
      newMinX += dx;
      newMaxY += dy;
      break;
    case "tl":
      newMinX += dx;
      newMinY += dy;
      break;
  }

  const originalWidth = original.maxX - original.minX;
  const originalHeight = original.maxY - original.minY;

  const newWidth = newMaxX - newMinX;
  const newHeight = newMaxY - newMinY;

  if (newWidth < 20 || newHeight < 20) return false;

  const scaleX = newWidth / originalWidth;
  const scaleY = newHeight / originalHeight;

  interaction.groupInitialNodes.forEach((init, id) => {
    const node = State.getNodeById(id);
    if (!node) return;

    node.x = newMinX + (init.x - original.minX) * scaleX;
    node.y = newMinY + (init.y - original.minY) * scaleY;
    node.width = init.width * scaleX;
    node.height = init.height * scaleY;
  });

  return true;
}

export function startGroupResize(interaction, e, bounds, State, handleKey) {
  interaction.mode = "groupResize";
  interaction.groupResizeHandle = handleKey;
  interaction.groupBounds = bounds;

  interaction.startX = e.clientX;
  interaction.startY = e.clientY;

  interaction.groupInitialNodes.clear();

  State.selectedNodeIds.forEach((id) => {
    const n = State.getNodeById(id);
    interaction.groupInitialNodes.set(id, {
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    });
  });

  State.snapshotState();
}
