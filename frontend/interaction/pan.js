export function startPan(interaction, e, State) {
  interaction.mode = "pan";
  interaction.panStartX = e.clientX;
  interaction.panStartY = e.clientY;
  interaction.startOffsetX = State.offsetX;
  interaction.startOffsetY = State.offsetY;
}

export function handlePanMove(interaction, e, State, redraw) {
  const dx = e.clientX - interaction.panStartX;
  const dy = e.clientY - interaction.panStartY;

  State.setOffset(
    interaction.startOffsetX + dx,
    interaction.startOffsetY + dy
  );

  redraw();
}