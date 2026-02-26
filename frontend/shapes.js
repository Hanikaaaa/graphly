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
    },

    applyConnectorLayout(node, el, zoomLevel) {
      // do nothing
      // rectangle uses CSS positioning
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
        conn.style.transform += " translateY(-50%) rotate(90deg)";
      }

      if (conn.classList.contains("right")) {
        conn.style.right = "-5px";
        conn.style.top = "50%";
        conn.style.transform += " translateY(-50%) rotate(90deg)";
      }
    });
  }
}

};