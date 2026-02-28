export function handleGroupDragMove(interaction, e, State, redraw) {
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

export function startGroupDrag(interaction, e, State) {
  interaction.mode = "groupDrag";
  interaction.startX = e.clientX;
  interaction.startY = e.clientY;

  interaction.dragStartPositions.clear();

  State.selectedNodeIds.forEach(id => {
    const node = State.getNodeById(id);
    if (!node) return;

    interaction.dragStartPositions.set(id, {
      x: node.x,
      y: node.y
    });
  });
}