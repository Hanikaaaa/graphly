import * as State from "../state.js";
import { applySemanticStyle } from "./ai-style-mapper.js";

export function transformAIToGraphlyState(graph) {
  const transformedNodes = [];
  const transformedConnections = [];

  const levelMap = {}; // for simple vertical layout
  const horizontalSpacing = 260;
  const verticalSpacing = 180;

  graph.nodes.forEach((aiNode, index) => {
    const level = aiNode.level || 0; // optional future support
    if (!levelMap[level]) levelMap[level] = 0;

    const x = levelMap[level] * horizontalSpacing;
    const y = level * verticalSpacing;

    levelMap[level]++;

    const node = State.createNodeObject(x, y);
    node.id = aiNode.id;
    node.text = aiNode.text || "Untitled";

    // 🔥 Apply semantic style here
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
