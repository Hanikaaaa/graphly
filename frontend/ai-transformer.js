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

  const horizontalSpacing = 240;
  const verticalSpacing = 180;
  const levelCount = {};

  graph.nodes.forEach((aiNode) => {
    const level = levels[aiNode.id] ?? 0;

    if (!levelCount[level]) levelCount[level] = 0;

    const x = 200 + levelCount[level] * horizontalSpacing;
    const y = 200 + level * verticalSpacing;

    levelCount[level]++;

    const node = State.createNodeObject(x, y);

    node.id = aiNode.id;
    node.text = aiNode.text || "Untitled";

    applySemanticStyle(node, aiNode);

    transformedNodes.push(node);
  });

  graph.connections.forEach((conn) => {
    transformedConnections.push({
      id: crypto.randomUUID(),
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
