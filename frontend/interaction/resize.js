export function handleNodeResize(interaction, e, State, ShapeRegistry, redraw) {
  const node = State.getNodeById(interaction.nodeId);
  if (!node) return;

  const dx = (e.clientX - interaction.lastClientX) / State.zoomLevel;
  const dy = (e.clientY - interaction.lastClientY) / State.zoomLevel;

  interaction.lastClientX = e.clientX;
  interaction.lastClientY = e.clientY;

  const shape = ShapeRegistry[node.shape] || ShapeRegistry.rectangle;

  const ctx = {
    dx,
    dy,
    resizeDir: interaction.resizeDir,
  };

  shape.applyResize?.(node, ctx);
  shape.enforceConstraints?.(node);

  redraw();
}
