export function hitTestConnection(
  worldX,
  worldY,
  connections,
  getNodeById,
  zoomLevel,
) {
  const HIT_DISTANCE = Math.max(18 / zoomLevel, 20);

  for (const conn of connections) {
    const from = getNodeById(conn.from);
    const to = getNodeById(conn.to);
    if (!from || !to) continue;

    const fromX = from.x + from.width / 2;
    const fromY = from.y + from.height / 2;
    const toX = to.x + to.width / 2;
    const toY = to.y + to.height / 2;

    const controlY = (fromY + toY) / 2;

    for (let t = 0; t <= 1; t += 0.01) {
      const x =
        (1 - t) * (1 - t) * fromX +
        2 * (1 - t) * t * fromX +
        t * t * toX;

      const y =
        (1 - t) * (1 - t) * fromY +
        2 * (1 - t) * t * controlY +
        t * t * toY;

      const dist = Math.hypot(worldX - x, worldY - y);

      if (dist <= HIT_DISTANCE) {
        return conn; 
      }
    }
  }

  return null;
}