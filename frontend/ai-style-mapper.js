// ai-style-mapper.js

export function applySemanticStyle(node, semanticNode) {
  const role = semanticNode.role || "detail";

  switch (role) {
    case "core":
      node.shape = "ellipse";
      node.color = "#6366f1";
      node.fontColor = "#ffffff";
      node.width = 220;
      node.height = 220;
      node.borderRadius = 999;
      break;

    case "category":
      node.shape = "rectangle";
      node.color = "#0ea5e9";
      node.fontColor = "#ffffff";
      node.width = 180;
      node.height = 120;
      node.borderRadius = 16;
      break;

    case "detail":
    default:
      node.shape = "rectangle";
      node.color = "#ffffff";
      node.fontColor = "#0f172a";
      node.width = 140;
      node.height = 100;
      node.borderRadius = 12;
      break;
  }

  return node;
}
