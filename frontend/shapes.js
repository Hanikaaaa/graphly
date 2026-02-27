export const ShapeRegistry = {};

function createBaseShape(config) {
  return {
    meta: {
      keepAspectRatio: false,
      supportsBorderRadius: false,
      connectors: ["top", "right", "bottom", "left"],
      ...config.meta
    },

    applyLayout(node, el) {
      Array.from(el.classList)
        .filter(c => c.startsWith("shape-"))
        .forEach(c => el.classList.remove(c));

      el.classList.add(`shape-${node.shape}`);

      config.applyLayout?.(node, el);
    },

    applyResize(node, ctx) {
      config.applyResize?.(node, ctx);
    },

    enforceConstraints(node) {
      config.enforceConstraints?.(node);
    },

    applyConnectorLayout(node, el, zoomLevel) {
      const connectors = el.querySelectorAll(".node-connector");

      connectors.forEach(conn => {
        conn.style.transform = `scale(${1 / zoomLevel})`;

        if (conn.classList.contains("top")) {
          conn.style.top = "-5px";
          conn.style.left = "50%";
          conn.style.transform += " translateX(-50%)";
        }

        if (conn.classList.contains("bottom")) {
          conn.style.bottom = "-5px";
          conn.style.left = "50%";
          conn.style.transform += " translateX(-50%)";
        }

        if (conn.classList.contains("left")) {
          conn.style.left = "-5px";
          conn.style.top = "50%";
          conn.style.transform += " translateY(-50%)";
        }

        if (conn.classList.contains("right")) {
          conn.style.right = "-5px";
          conn.style.top = "50%";
          conn.style.transform += " translateY(-50%)";
        }
      });
    }
  };
}

/* ================= RECTANGLE ================= */

ShapeRegistry.rectangle = createBaseShape({
  meta: { supportsBorderRadius: true },

  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");
    shapeLayer.style.clipPath = "";
  },

  applyResize(node, ctx) {
    const {
      dx, dy,
      startW, startH,
      startNodeX, startNodeY,
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
});

ShapeRegistry.circle = createBaseShape({
  meta: { keepAspectRatio: true },

  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");
    shapeLayer.style.clipPath = "circle(50% at 50% 50%)";
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
});

ShapeRegistry.diamond = createBaseShape({
  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");

    shapeLayer.style.clipPath =
      "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
  },

  enforceConstraints(node) {
    node.width = Math.max(node.width, 80);
    node.height = Math.max(node.height, 60);
  },

  applyResize(node, ctx) {
    ShapeRegistry.rectangle.applyResize(node, ctx);
  }
});

ShapeRegistry.triangle = createBaseShape({
  meta: {
    supportsBorderRadius: false
  },

  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");

    shapeLayer.style.clipPath =
      "polygon(50% 0%, 100% 100%, 0% 100%)";

    shapeLayer.style.borderRadius = "0px";
  },

  enforceConstraints(node) {
    node.width = Math.max(node.width, 80);
    node.height = Math.max(node.height, 60);
  },

  applyResize(node, ctx) {
    // behave like rectangle
    ShapeRegistry.rectangle.applyResize(node, ctx);
  },

  applyConnectorLayout(node, el, zoomLevel) {
    const connectors = el.querySelectorAll(".node-connector");

    connectors.forEach(conn => {
      conn.style.transform = `scale(${1 / zoomLevel})`;

      if (conn.classList.contains("top")) {
        // Apex
        conn.style.top = "-6px";
        conn.style.left = "50%";
        conn.style.transform += " translateX(-50%)";
      }

      if (conn.classList.contains("bottom")) {
        // Middle of base
        conn.style.bottom = "-6px";
        conn.style.left = "50%";
        conn.style.transform += " translateX(-50%)";
      }

      if (conn.classList.contains("left")) {
        // Mid of left edge (approximate)
        conn.style.left = "-6px";
        conn.style.top = "50%";
        conn.style.transform += " translateY(-50%)";
      }

      if (conn.classList.contains("right")) {
        // Mid of right edge (approximate)
        conn.style.right = "-6px";
        conn.style.top = "50%";
        conn.style.transform += " translateY(-50%)";
      }
    });
  }
});