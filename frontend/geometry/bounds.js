export function getSelectionBounds(nodes, selectedIds) {
  if (selectedIds.size <= 1) return null;

  const selected = nodes.filter(n =>
    selectedIds.has(n.id)
  );

  const minX = Math.min(...selected.map(n => n.x));
  const minY = Math.min(...selected.map(n => n.y));
  const maxX = Math.max(...selected.map(n => n.x + n.width));
  const maxY = Math.max(...selected.map(n => n.y + n.height));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}