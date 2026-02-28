export function handleConnectMove(interaction, e, redraw) {
  interaction.connectionCurrentX = e.clientX;
  interaction.connectionCurrentY = e.clientY;
  redraw();
}

export function handleConnectEnd(
  interaction,
  State,
  attachNodeHandlers,
  queueStateSync,
) {
  const sourceId = interaction.connectionSourceId;

  const worldX =
    (interaction.connectionCurrentX - State.offsetX) / State.zoomLevel;

  const worldY =
    (interaction.connectionCurrentY - State.offsetY) / State.zoomLevel;

  let targetNode = null;

  State.nodes.forEach((node) => {
    const inside =
      worldX >= node.x &&
      worldX <= node.x + node.width &&
      worldY >= node.y &&
      worldY <= node.y + node.height;

    if (inside) {
      targetNode = node;
    }
  });

  State.snapshotState();

  if (targetNode && targetNode.id !== sourceId) {
    State.addConnection(sourceId, targetNode.id);
  } else {
    const newNode = State.createNodeObject(worldX - 70, worldY - 40);

    State.addNode(newNode);
    attachNodeHandlers(newNode);
    State.addConnection(sourceId, newNode.id);
  }

  queueStateSync("node_update");
  interaction.connectionSourceId = null;
  interaction.connectionCurrentX = 0;
  interaction.connectionCurrentY = 0;
}
