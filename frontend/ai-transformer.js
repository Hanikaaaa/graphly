import * as State from "../state.js";
import { applySemanticStyle } from "./ai-style-mapper.js";

function computeLevels(nodes, connections) {
  const levels = {};
  const adjacency = {};

  // Build adjacency list
  nodes.forEach((n) => {
    adjacency[n.id] = [];
  });

  connections.forEach((c) => {
    if (adjacency[c.from]) {
      adjacency[c.from].push(c.to);
    }
  });

  // Find root (core node)
  const root = nodes.find((n) => n.role === "core");
  if (!root) return levels;

  // BFS from root
  const queue = [{ id: root.id, level: 0 }];
  levels[root.id] = 0;

  while (queue.length > 0) {
    const current = queue.shift();

    adjacency[current.id].forEach((childId) => {
      if (levels[childId] === undefined) {
        levels[childId] = current.level + 1;
        queue.push({ id: childId, level: current.level + 1 });
      }
    });
  }

  return levels;
}

export function transformAIToGraphlyState(graph) {
  const transformedNodes = [];
  const transformedConnections = [];

  const levels = computeLevels(graph.nodes, graph.connections);

  const startY = 200;
  const centerX = 800; // adjust if needed

  // Group nodes by level
  const levelGroups = {};
  graph.nodes.forEach((n) => {
    const level = levels[n.id] ?? 0;
    if (!levelGroups[level]) levelGroups[level] = [];
    levelGroups[level].push(n);
  });

  // Position nodes level by level (CENTERED)
  Object.keys(levelGroups).forEach((levelKey) => {
    const level = Number(levelKey);
    const nodesAtLevel = levelGroups[level];

    // Measure nodes
    const tempNodes = nodesAtLevel.map((aiNode) => {
      const temp = State.createNodeObject(0, 0);
      applySemanticStyle(temp, aiNode);
      return { aiNode, width: temp.width, height: temp.height };
    });

    const gap = 80;

    const totalWidth =
      tempNodes.reduce((sum, n) => sum + n.width, 0) +
      gap * (tempNodes.length - 1);

    let currentX = centerX - totalWidth / 2;

    // Calculate max height in this level
    const maxHeight = Math.max(...tempNodes.map((n) => n.height));

    // Compute Y dynamically using accumulated level heights
    const verticalGap = 100;

    const previousLevelsHeight = Object.keys(levelGroups)
      .filter((k) => Number(k) < level)
      .reduce((sum, k) => {
        const prevNodes = levelGroups[k];
        const heights = prevNodes.map((aiNode) => {
          const temp = State.createNodeObject(0, 0);
          applySemanticStyle(temp, aiNode);
          return temp.height;
        });
        return sum + Math.max(...heights) + verticalGap;
      }, 0);

    const y = startY + previousLevelsHeight;

    tempNodes.forEach(({ aiNode, width }) => {
      const x = currentX + width / 2;

      const node = State.createNodeObject(x, y);
      node.id = aiNode.id;
      node.text = aiNode.text || "Untitled";

      applySemanticStyle(node, aiNode);

      transformedNodes.push(node);

      currentX += width + gap;
    });
  });

  // Connections
  graph.connections.forEach((conn) => {
    transformedConnections.push({
      id: conn.id,
      from: conn.from,
      to: conn.to,
      color: "#94a3b8",
      width: 2.5,
      style: "solid",
    });
  });

  return {
    nodes: transformedNodes,
    connections: transformedConnections,
  };
}
