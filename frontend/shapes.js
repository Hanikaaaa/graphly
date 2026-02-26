// shapes.js

export const ShapeRegistry = {
  rectangle: {
    applyLayout(node, el) {
      el.style.borderRadius = `${node.borderRadius}px`;
      el.style.padding = "10px";
      el.style.display = "block";
    },

    enforceConstraints(node) {
      // rectangles have no constraints
    },

    applyResize(node, ctx) {
      const {
        dx,
        dy,
        startW,
        startH,
        startNodeX,
        startNodeY,
        resizeDir
      } = ctx;

      const minW = 80;
      const minH = 40;

      if (resizeDir.includes("right")) {
        node.width = Math.max(minW, startW + dx);
      }

      if (resizeDir.includes("left")) {
        const newW = Math.max(minW, startW - dx);
        node.x = startNodeX + (startW - newW);
        node.width = newW;
      }

      if (resizeDir.includes("bottom")) {
        node.height = Math.max(minH, startH + dy);
      }

      if (resizeDir.includes("top")) {
        const newH = Math.max(minH, startH - dy);
        node.y = startNodeY + (startH - newH);
        node.height = newH;
      }
    }
  },

  circle: {
    applyLayout(node, el) {
      el.style.borderRadius = "50%";
      el.style.padding = "0";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
    },

    enforceConstraints(node) {
      const size = Math.max(node.width, node.height);
      node.width = size;
      node.height = size;
    },

    applyResize(node, ctx) {
      const { dx, dy, startW } = ctx;
      const minSize = 80;

      const delta = Math.max(dx, dy);
      const newSize = Math.max(minSize, startW + delta);

      node.width = newSize;
      node.height = newSize;
    }
  }
};