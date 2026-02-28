export function handleMarqueeMove(interaction, e, State, redraw) {
  interaction.marqueeCurrentX = e.clientX;
  interaction.marqueeCurrentY = e.clientY;

  const startX = (interaction.marqueeStartX - State.offsetX) / State.zoomLevel;
  const startY = (interaction.marqueeStartY - State.offsetY) / State.zoomLevel;

  const currentX =
    (interaction.marqueeCurrentX - State.offsetX) / State.zoomLevel;
  const currentY =
    (interaction.marqueeCurrentY - State.offsetY) / State.zoomLevel;

  const minX = Math.min(startX, currentX);
  const maxX = Math.max(startX, currentX);
  const minY = Math.min(startY, currentY);
  const maxY = Math.max(startY, currentY);

  State.clearSelection();

  State.nodes.forEach((node) => {
    const intersects =
      node.x < maxX &&
      node.x + node.width > minX &&
      node.y < maxY &&
      node.y + node.height > minY;

    if (intersects) {
      State.selectedNodeIds.add(node.id);
    }
  });

  redraw();
}
