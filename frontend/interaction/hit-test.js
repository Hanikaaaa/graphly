export function hitTestConnection(worldX, worldY, connections, getNodeById, zoomLevel) {
  const HIT_DISTANCE = 8 / zoomLevel;
  let clickedConnection = null;

  connections.forEach(conn => {
    const from = getNodeById(conn.from);
    const to = getNodeById(conn.to);
    if (!from || !to) return;

    const fromX = from.x + from.width / 2;
    const fromY = from.y + from.height / 2;
    const toX = to.x + to.width / 2;
    const toY = to.y + to.height / 2;

    const controlY = (fromY + toY) / 2;

    for (let t = 0; t <= 1; t += 0.05) {
      const x =
        (1 - t) * (1 - t) * fromX +
        2 * (1 - t) * t * fromX +
        t * t * toX;

      const y =
        (1 - t) * (1 - t) * fromY +
        2 * (1 - t) * t * controlY +
        t * t * toY;

      const dist = Math.hypot(worldX - x, worldY - y);
      if (dist < HIT_DISTANCE) {
        clickedConnection = conn;
        break;
      }
    }
  });

  return clickedConnection;
}