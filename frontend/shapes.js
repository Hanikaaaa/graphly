export const ShapeRegistry = {};

function createBaseShape(config) {
  return {
    meta: {
      keepAspectRatio: false,
      supportsBorderRadius: false,
      connectors: ["top", "right", "bottom", "left"],
      ...config.meta,
    },

    applyLayout(node, el) {
      Array.from(el.classList)
        .filter((c) => c.startsWith("shape-"))
        .forEach((c) => el.classList.remove(c));

      el.classList.add(`shape-${node.shape}`);
      if (el._text && el._input) {
        el._text.style.clipPath = "";
        el._input.style.clipPath = "";
        el._text.style.padding = "12px";
        el._input.style.padding = "12px";
      }

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

      connectors.forEach((conn) => {
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
    },
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
    const { dx, dy, resizeDir } = ctx;

    const minW = 80;
    const minH = 40;

    if (resizeDir.includes("right")) {
      node.width = Math.max(minW, node.width + dx);
    }

    if (resizeDir.includes("left")) {
      const newW = Math.max(minW, node.width - dx);
      node.x += node.width - newW;
      node.width = newW;
    }

    if (resizeDir.includes("bottom")) {
      node.height = Math.max(minH, node.height + dy);
    }

    if (resizeDir.includes("top")) {
      const newH = Math.max(minH, node.height - dy);
      node.y += node.height - newH;
      node.height = newH;
    }
  },
});

ShapeRegistry.circle = createBaseShape({
  meta: { keepAspectRatio: true },

  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");
    shapeLayer.style.clipPath = "circle(50% at 50% 50%)";
    if (el._text && el._input) {
      el._text.style.clipPath = "circle(50% at 50% 50%)";
      el._input.style.clipPath = "circle(50% at 50% 50%)";
    }
  },

  enforceConstraints(node) {
    const size = Math.max(node.width, node.height);
    node.width = size;
    node.height = size;
  },

  applyResize(node, ctx) {
    const { dx, dy } = ctx;
    const minSize = 80;

    const delta = Math.max(dx, dy);
    const newSize = Math.max(minSize, node.width + delta);

    node.width = newSize;
    node.height = newSize;
  },
});

ShapeRegistry.diamond = createBaseShape({
  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");

    const diamondClip = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
    shapeLayer.style.clipPath = diamondClip;
    if (el._text && el._input) {
      el._text.style.clipPath = diamondClip;
      el._input.style.clipPath = diamondClip;
      el._text.style.padding = "18% 16%";
      el._input.style.padding = "18% 16%";
    }
  },

  enforceConstraints(node) {
    node.width = Math.max(node.width, 80);
    node.height = Math.max(node.height, 60);
  },

  applyResize(node, ctx) {
    ShapeRegistry.rectangle.applyResize(node, ctx);
  },
});

ShapeRegistry.triangle = createBaseShape({
  meta: {
    supportsBorderRadius: false,
  },

  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");

    shapeLayer.style.clipPath = "polygon(50% 0%, 100% 100%, 0% 100%)";

    shapeLayer.style.borderRadius = "0px";
    if (el._text && el._input) {
      const innerTriangle = "polygon(50% 10%, 88% 92%, 12% 92%)";
      el._text.style.clipPath = innerTriangle;
      el._input.style.clipPath = innerTriangle;
      el._text.style.padding = "22% 14% 14%";
      el._input.style.padding = "22% 14% 14%";
    }
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

    connectors.forEach((conn) => {
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
  },
});

ShapeRegistry.parallelogram = createBaseShape({
  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");
    const paraClip = "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)";
    shapeLayer.style.clipPath = paraClip;
    if (el._text && el._input) {
      const innerParaClip = "polygon(24% 8%, 96% 8%, 78% 92%, 4% 92%)";
      el._text.style.clipPath = innerParaClip;
      el._input.style.clipPath = innerParaClip;
      el._text.style.padding = "12% 16%";
      el._input.style.padding = "12% 16%";
    }
  },

  enforceConstraints(node) {
    node.width = Math.max(node.width, 100);
    node.height = Math.max(node.height, 60);
  },

  applyResize(node, ctx) {
    ShapeRegistry.rectangle.applyResize(node, ctx);
  },
});

ShapeRegistry.hexagon = createBaseShape({
  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");
    const hexClip =
      "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
    shapeLayer.style.clipPath = hexClip;
    if (el._text && el._input) {
      const innerHexClip =
        "polygon(28% 8%, 72% 8%, 92% 50%, 72% 92%, 28% 92%, 8% 50%)";
      el._text.style.clipPath = innerHexClip;
      el._input.style.clipPath = innerHexClip;
      el._text.style.padding = "14% 16%";
      el._input.style.padding = "14% 16%";
    }
  },

  enforceConstraints(node) {
    node.width = Math.max(node.width, 100);
    node.height = Math.max(node.height, 80);
  },

  applyResize(node, ctx) {
    ShapeRegistry.rectangle.applyResize(node, ctx);
  },
});

ShapeRegistry.trapezoid = createBaseShape({
  applyLayout(node, el) {
    const shapeLayer = el.querySelector(".node-shape-layer");
    const trapClip = "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)";
    shapeLayer.style.clipPath = trapClip;
    if (el._text && el._input) {
      const innerTrapClip = "polygon(24% 8%, 76% 8%, 92% 92%, 8% 92%)";
      el._text.style.clipPath = innerTrapClip;
      el._input.style.clipPath = innerTrapClip;
      el._text.style.padding = "14% 14% 12%";
      el._input.style.padding = "14% 14% 12%";
    }
  },

  enforceConstraints(node) {
    node.width = Math.max(node.width, 100);
    node.height = Math.max(node.height, 60);
  },

  applyResize(node, ctx) {
    ShapeRegistry.rectangle.applyResize(node, ctx);
  },
});
