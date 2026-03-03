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
  const layoutMode = State.currentLayoutMode; // "tree" or "radial"

  const levelGroups = {};

  graph.nodes.forEach((n) => {
    const level = levels[n.id] ?? 0;
    if (!levelGroups[level]) levelGroups[level] = [];
    levelGroups[level].push(n);
  });

  // Tree Layout

  if (layoutMode === "tree") {
    const startY = 200;
    const centerX = 800;
    const verticalGap = 120;
    const horizontalGap = 80;

    Object.keys(levelGroups)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((level) => {
        const nodesAtLevel = levelGroups[level];

        const tempNodes = nodesAtLevel.map((aiNode) => {
          const temp = State.createNodeObject(0, 0);
          applySemanticStyle(temp, aiNode);
          return { aiNode, width: temp.width, height: temp.height };
        });

        const totalWidth =
          tempNodes.reduce((sum, n) => sum + n.width, 0) +
          horizontalGap * (tempNodes.length - 1);

        let currentX = centerX - totalWidth / 2;

        const previousLevelsHeight = Object.keys(levelGroups)
          .map(Number)
          .filter((k) => k < level)
          .reduce((sum, k) => {
            const heights = levelGroups[k].map((aiNode) => {
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

          currentX += width + horizontalGap;
        });
      });
  }

  // Radial Layout

  if (layoutMode === "radial") {
    const centerX = 800;
    const centerY = 400;
    const radiusStep = 340;

    // Build adjacency map (parent -> children)
    const childrenMap = {};
    graph.nodes.forEach((n) => {
      childrenMap[n.id] = [];
    });

    graph.connections.forEach((c) => {
      if (childrenMap[c.from]) {
        childrenMap[c.from].push(c.to);
      }
    });

    // Find root
    const root = graph.nodes.find((n) => n.role === "core");
    if (!root) return;

    // Helper to get node by id
    const nodeMap = {};
    graph.nodes.forEach((n) => {
      nodeMap[n.id] = n;
    });

    function placeNode(nodeId, level, angleStart, angleEnd) {
      const angle = (angleStart + angleEnd) / 2;
      const radius = level * radiusStep;

      let x, y;

      if (level === 0) {
        x = centerX;
        y = centerY;
      } else {
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
      }

      const aiNode = nodeMap[nodeId];

      const node = State.createNodeObject(x, y);
      node.id = aiNode.id;
      node.text = aiNode.text || "Untitled";

      applySemanticStyle(node, aiNode);
      transformedNodes.push(node);

      const children = childrenMap[nodeId];
      if (!children || children.length === 0) return;

      const sectorSize = (angleEnd - angleStart) / children.length;

      children.forEach((childId, index) => {
        const childStart = angleStart + index * sectorSize;
        const childEnd = childStart + sectorSize;

        placeNode(childId, level + 1, childStart, childEnd);
      });
    }
    placeNode(root.id, 0, -Math.PI / 2, (3 * Math.PI) / 2);
  }

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
