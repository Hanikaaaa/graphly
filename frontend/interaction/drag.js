export function handleDragPending(interaction, e, State, DRAG_THRESHOLD) {
  const dx = e.clientX - interaction.startX;
  const dy = e.clientY - interaction.startY;

  if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    interaction.mode = "drag";
    State.snapshotState();

    interaction.dragStartPositions.clear();

    const selected = State.selectedNodeIds.size
      ? State.selectedNodeIds
      : new Set([interaction.nodeId]);

    selected.forEach((id) => {
      const n = State.getNodeById(id);
      if (!n) return;

      interaction.dragStartPositions.set(id, {
        x: n.x,
        y: n.y,
      });
    });
  }
}

export function handleDragMove(interaction, e, State, redraw) {
  const dx = (e.clientX - interaction.startX) / State.zoomLevel;
  const dy = (e.clientY - interaction.startY) / State.zoomLevel;

  interaction.dragStartPositions.forEach((startPos, id) => {
    const node = State.getNodeById(id);
    if (!node) return;

    node.x = startPos.x + dx;
    node.y = startPos.y + dy;
  });

  redraw();
}
