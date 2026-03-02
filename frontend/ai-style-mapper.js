export function applySemanticStyle(node, semanticNode) {
  const role = (semanticNode.role || "concept").toLowerCase();

  switch (role) {
    case "core":
      node.shape = "circle";
      node.color = "#4f46e5";
      node.fontColor = "#ffffff";
      node.width = 240;
      node.height = 240;
      node.borderRadius = 999;
      break;

    case "theme":
      node.shape = "hexagon";
      node.color = "#0ea5e9";
      node.fontColor = "#ffffff";
      node.width = 200;
      node.height = 140;
      break;

    case "concept":
      node.shape = "rectangle";
      node.color = "#22c55e";
      node.fontColor = "#ffffff";
      node.width = 180;
      node.height = 120;
      node.borderRadius = 16;
      break;

    case "process":
      node.shape = "parallelogram";
      node.color = "#f59e0b";
      node.fontColor = "#ffffff";
      node.width = 200;
      node.height = 120;
      break;

    case "decision":
      node.shape = "diamond";
      node.color = "#ef4444";
      node.fontColor = "#ffffff";
      node.width = 180;
      node.height = 180;
      break;

    case "example":
      node.shape = "triangle";
      node.color = "#8b5cf6";
      node.fontColor = "#ffffff";
      node.width = 160;
      node.height = 140;
      break;

    case "fact":
      node.shape = "rectangle";
      node.color = "#64748b";
      node.fontColor = "#ffffff";
      node.width = 160;
      node.height = 100;
      node.borderRadius = 8;
      break;

    case "warning":
      node.shape = "triangle";
      node.color = "#dc2626";
      node.fontColor = "#ffffff";
      node.width = 160;
      node.height = 140;
      break;

    case "question":
      node.shape = "ellipse";
      node.color = "#14b8a6";
      node.fontColor = "#ffffff";
      node.width = 180;
      node.height = 120;
      break;

    default:
      node.shape = "rectangle";
      node.color = "#94a3b8";
      node.fontColor = "#ffffff";
      node.width = 160;
      node.height = 100;
  }

  return node;
}
