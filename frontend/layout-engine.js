import { getGraphBounds } from "./geometry/bounds.js";

const LEVEL_GAP_Y = 180;
const SIBLING_GAP_X = 56;
const COMPONENT_GAP_X = 220;
const RADIAL_RING_GAP = 210;

function buildDirectedAdjacency(nodes, connections) {
  const out = new Map();
  const incomingCount = new Map();
  const nodeIds = new Set(nodes.map((n) => n.id));

  nodes.forEach((n) => {
    out.set(n.id, []);
    incomingCount.set(n.id, 0);
  });

  connections.forEach((c) => {
    if (!nodeIds.has(c.from) || !nodeIds.has(c.to)) return;
    out.get(c.from).push(c.to);
    incomingCount.set(c.to, (incomingCount.get(c.to) || 0) + 1);
  });

  return { out, incomingCount };
}

function buildUndirectedAdjacency(nodes, connections) {
  const adj = new Map();
  const nodeIds = new Set(nodes.map((n) => n.id));

  nodes.forEach((n) => adj.set(n.id, new Set()));
  connections.forEach((c) => {
    if (!nodeIds.has(c.from) || !nodeIds.has(c.to)) return;
    adj.get(c.from).add(c.to);
    adj.get(c.to).add(c.from);
  });

  return adj;
}

function getComponentNodeIds(nodes, undirectedAdj) {
  const components = [];
  const visited = new Set();

  nodes.forEach((n) => {
    if (visited.has(n.id)) return;

    const queue = [n.id];
    const comp = [];
    visited.add(n.id);

    while (queue.length) {
      const cur = queue.shift();
      comp.push(cur);
      (undirectedAdj.get(cur) || []).forEach((next) => {
        if (visited.has(next)) return;
        visited.add(next);
        queue.push(next);
      });
    }

    components.push(comp);
  });

  return components;
}

export function detectLayoutRoot(nodeIds, outgoingAdj, incomingCount) {
  let best = null;
  let bestScore = null;

  nodeIds.forEach((id) => {
    const inDeg = incomingCount.get(id) || 0;
    const outDeg = (outgoingAdj.get(id) || []).length;
    const score = [inDeg, -outDeg, id];

    if (!bestScore) {
      best = id;
      bestScore = score;
      return;
    }

    const better =
      score[0] < bestScore[0] ||
      (score[0] === bestScore[0] && score[1] < bestScore[1]) ||
      (score[0] === bestScore[0] && score[1] === bestScore[1] && score[2] < bestScore[2]);

    if (better) {
      best = id;
      bestScore = score;
    }
  });

  return best;
}

function computeLevelsForComponent(componentIds, rootId, outgoingAdj, undirectedAdj) {
  const componentSet = new Set(componentIds);
  const levels = new Map();
  const queue = [rootId];
  levels.set(rootId, 0);

  while (queue.length) {
    const cur = queue.shift();
    const curLevel = levels.get(cur) || 0;

    (outgoingAdj.get(cur) || []).forEach((next) => {
      if (!componentSet.has(next) || levels.has(next)) return;
      levels.set(next, curLevel + 1);
      queue.push(next);
    });
  }

  // Fallback for non-perfect trees/cycles/disconnected directed parts.
  while (levels.size < componentIds.length) {
    const remaining = componentIds.filter((id) => !levels.has(id));
    const seed = remaining[0];
    const queueUnd = [seed];
    levels.set(seed, 0);

    while (queueUnd.length) {
      const cur = queueUnd.shift();
      const curLevel = levels.get(cur) || 0;

      (undirectedAdj.get(cur) || []).forEach((next) => {
        if (!componentSet.has(next) || levels.has(next)) return;
        levels.set(next, curLevel + 1);
        queueUnd.push(next);
      });
    }
  }

  return levels;
}

function normalizeComponentPositions(componentNodeIds, positions, nodeMap) {
  const bounds = getGraphBounds(
    componentNodeIds.map((id) => {
      const node = nodeMap.get(id);
      const p = positions.get(id);
      return { ...node, x: p.x, y: p.y };
    }),
  );
  if (!bounds) return { width: 0, height: 0 };

  componentNodeIds.forEach((id) => {
    const p = positions.get(id);
    positions.set(id, {
      x: p.x - bounds.minX,
      y: p.y - bounds.minY,
    });
  });

  return { width: bounds.width, height: bounds.height };
}

function centerLayoutLikeCurrentGraph(nodes, positions) {
  const currentBounds = getGraphBounds(nodes);
  if (!currentBounds) return;

  const layoutNodes = nodes.map((n) => {
    const p = positions.get(n.id);
    return { ...n, x: p.x, y: p.y };
  });
  const layoutBounds = getGraphBounds(layoutNodes);
  if (!layoutBounds) return;

  const currentCenterX = currentBounds.minX + currentBounds.width / 2;
  const currentCenterY = currentBounds.minY + currentBounds.height / 2;
  const layoutCenterX = layoutBounds.minX + layoutBounds.width / 2;
  const layoutCenterY = layoutBounds.minY + layoutBounds.height / 2;

  const dx = currentCenterX - layoutCenterX;
  const dy = currentCenterY - layoutCenterY;

  nodes.forEach((n) => {
    const p = positions.get(n.id);
    positions.set(n.id, { x: p.x + dx, y: p.y + dy });
  });
}

export function computeTreeLayoutPositions(nodes, connections) {
  const positions = new Map();
  if (!nodes.length) return positions;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const { out, incomingCount } = buildDirectedAdjacency(nodes, connections);
  const undirected = buildUndirectedAdjacency(nodes, connections);
  const components = getComponentNodeIds(nodes, undirected);

  let offsetX = 0;
  components.forEach((componentIds) => {
    const root = detectLayoutRoot(componentIds, out, incomingCount);
    const levels = computeLevelsForComponent(componentIds, root, out, undirected);
    const grouped = new Map();

    componentIds.forEach((id) => {
      const level = levels.get(id) || 0;
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level).push(id);
    });

    const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);
    sortedLevels.forEach((level) => {
      const ids = grouped.get(level);
      ids.sort((a, b) => a.localeCompare(b));

      const totalWidth =
        ids.reduce((sum, id) => sum + (nodeMap.get(id).width || 0), 0) +
        SIBLING_GAP_X * Math.max(0, ids.length - 1);
      let cursorX = -totalWidth / 2;

      ids.forEach((id) => {
        const node = nodeMap.get(id);
        positions.set(id, {
          x: cursorX + node.width / 2,
          y: level * LEVEL_GAP_Y,
        });
        cursorX += node.width + SIBLING_GAP_X;
      });
    });

    const compSize = normalizeComponentPositions(componentIds, positions, nodeMap);
    componentIds.forEach((id) => {
      const p = positions.get(id);
      positions.set(id, { x: p.x + offsetX, y: p.y });
    });
    offsetX += compSize.width + COMPONENT_GAP_X;
  });

  centerLayoutLikeCurrentGraph(nodes, positions);
  return positions;
}

export function computeRadialLayoutPositions(nodes, connections) {
  const positions = new Map();
  if (!nodes.length) return positions;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const { out, incomingCount } = buildDirectedAdjacency(nodes, connections);
  const undirected = buildUndirectedAdjacency(nodes, connections);
  const components = getComponentNodeIds(nodes, undirected);

  let offsetX = 0;
  components.forEach((componentIds) => {
    const root = detectLayoutRoot(componentIds, out, incomingCount);
    const levels = computeLevelsForComponent(componentIds, root, out, undirected);
    const grouped = new Map();

    componentIds.forEach((id) => {
      const level = levels.get(id) || 0;
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level).push(id);
    });

    // Root at component center.
    const rootNode = nodeMap.get(root);
    positions.set(root, { x: rootNode.width / 2, y: rootNode.height / 2 });

    Array.from(grouped.keys())
      .filter((level) => level > 0)
      .sort((a, b) => a - b)
      .forEach((level) => {
        const ids = grouped.get(level).slice().sort((a, b) => a.localeCompare(b));
        const radius = level * RADIAL_RING_GAP;
        const step = (Math.PI * 2) / Math.max(1, ids.length);
        const angleOffset = -Math.PI / 2 + level * 0.12;

        ids.forEach((id, idx) => {
          const node = nodeMap.get(id);
          const angle = angleOffset + idx * step;
          positions.set(id, {
            x: radius * Math.cos(angle) + rootNode.width / 2 - node.width / 2,
            y: radius * Math.sin(angle) + rootNode.height / 2 - node.height / 2,
          });
        });
      });

    const compSize = normalizeComponentPositions(componentIds, positions, nodeMap);
    componentIds.forEach((id) => {
      const p = positions.get(id);
      positions.set(id, { x: p.x + offsetX, y: p.y });
    });
    offsetX += compSize.width + COMPONENT_GAP_X;
  });

  centerLayoutLikeCurrentGraph(nodes, positions);
  return positions;
}

export function applyNodePositions(nodes, positions) {
  nodes.forEach((node) => {
    const pos = positions.get(node.id);
    if (!pos) return;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
    node.x = Math.round(pos.x);
    node.y = Math.round(pos.y);
  });
}
