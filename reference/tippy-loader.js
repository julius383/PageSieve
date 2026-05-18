/**
 * tippy-loader.js
 *
 * Renders Tippy.js annotated images from a static JSON object.
 *
 * Usage in a Quarto .qmd file:
 *
 *   ```{=html}
 *   <script src="tippy-loader.js"></script>
 *   <script>
 *     TippyLoader.render([
 *       {
 *         id: "fig-1",
 *         image: "photo-a.jpg",
 *         markers: [
 *           { id: 1, x_pct: 28.5, y_pct: 42.1, title: "Site A", content: "Details here.", placement: "top",    color: "#e8ff47" },
 *           { id: 2, x_pct: 61.3, y_pct: 55.8, title: "Site B", content: "More detail.",  placement: "right",  color: "#47c8ff" }
 *         ]
 *       },
 *       {
 *         id: "fig-2",
 *         image: "photo-b.jpg",
 *         markers: [
 *           { id: 1, x_pct: 44.0, y_pct: 30.0, title: "Site C", content: "Control.",      placement: "bottom", color: "#ff7043" }
 *         ]
 *       }
 *     ]);
 *   </script>
 *
 *   <div id="fig-1"></div>
 *   <div id="fig-2"></div>
 *   ```
 */

var TippyLoader = {

  render: function (figures) {
    // Load Tippy + Popper from CDN if not already present, then render
    if (window.tippy) {
      this._renderAll(figures);
      return;
    }

    var head = document.head;

    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/tippy.js@6/dist/tippy.css";
    head.appendChild(css);

    var popper = document.createElement("script");
    popper.src = "https://unpkg.com/@popperjs/core@2";
    popper.onload = function () {
      var tippy = document.createElement("script");
      tippy.src = "https://unpkg.com/tippy.js@6";
      tippy.onload = function () { TippyLoader._renderAll(figures); };
      head.appendChild(tippy);
    };
    head.appendChild(popper);
  },

  _renderAll: function (figures) {
    figures.forEach(function (fig) {
      var container = document.getElementById(fig.id);
      console.dir(fig);
      if (!container) {
        console.error("[TippyLoader] No element found for id: " + fig.id);
        return;
      }

      // Wrapper div — markers are positioned inside this
      var wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;display:inline-block;line-height:0;max-width:100%";

      // Image
      var img = document.createElement("img");
      img.src = `../assets/${fig.image}`;
      img.style.cssText = "display:block;max-width:100%;height:auto";
      wrapper.appendChild(img);

      // Place markers once image has loaded
      function placeMarkers() {
        (fig.markers || []).forEach(function (m) {
          var dot = document.createElement("div");
          dot.textContent = m.id;
          dot.style.cssText = [
            "position:absolute",
            "left:"        + m.x_pct + "%",
            "top:"         + m.y_pct + "%",
            "width:24px", "height:24px",
            "transform:translate(-50%,-50%)",
            "border-radius:50%",
            "background:"  + (m.color || "#e8ff47"),
            "border:2px solid #000",
            "display:flex", "align-items:center", "justify-content:center",
            "font-size:11px", "font-weight:700", "font-family:monospace",
            "color:#000", "cursor:pointer", "z-index:10", "box-sizing:border-box",
            "transition:transform 0.15s"
          ].join(";");

          dot.addEventListener("mouseenter", function () { dot.style.transform = "translate(-50%,-50%) scale(1.25)"; });
          dot.addEventListener("mouseleave", function () { dot.style.transform = "translate(-50%,-50%) scale(1)"; });

          tippy(dot, {
            content:   "<strong>" + (m.title || "") + "</strong>" + (m.content ? "<br>" + m.content : ""),
            allowHTML: true,
            placement: m.placement || "top",
            arrow:     true,
            theme:     "light-border"
          });

          wrapper.appendChild(dot);
        });
      }

      img.complete ? placeMarkers() : img.addEventListener("load", placeMarkers);
      container.appendChild(wrapper);
    });
  }

};
