/*
 * sections/about-snake-bar.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_about_snake_bar === "function") {
    window.__ananasSection_about_snake_bar();
    return;
  }

  function init(root) {
    if (!root || root.getAttribute("data-section-ready") === "true") return;
    root.setAttribute("data-section-ready", "true");

    var viewport = root.querySelector(".snake-bar__viewport");
    var track = root.querySelector(".snake-bar__track");
    var sequence = root.querySelector("[data-snake-sequence]");
    var clone = root.querySelector("[data-snake-clone]");
    if (!viewport || !track || !sequence || !clone) return;

    var original = sequence.innerHTML;
    var speedSeconds = parseFloat(root.getAttribute("data-snake-speed")) || 18;
    var speed = 0;
    var x = 0;
    var lastTime = 0;
    var sequenceWidth = 0;
    var rafId = null;

    function setup() {
      // READ before any DOM mutations to avoid forced reflow
      var viewportWidth = viewport.offsetWidth;
      if (!viewportWidth) return;

      // Reset to original for accurate base measurement
      sequence.innerHTML = original;
      clone.innerHTML = "";
      track.style.transform = "translate3d(0,0,0)";

      // One forced reflow here — unavoidable for accurate baseWidth
      var baseWidth = sequence.scrollWidth || 1;

      var copiesNeeded = Math.ceil((viewportWidth + baseWidth) / baseWidth);
      copiesNeeded = Math.max(2, copiesNeeded + 1);
      copiesNeeded = Math.min(24, copiesNeeded);

      // Build full HTML as a string, then write once (no more reflows)
      var html = original;
      for (var i = 1; i < copiesNeeded; i += 1) html += original;
      sequence.innerHTML = html;
      clone.innerHTML = html;

      sequenceWidth = baseWidth * copiesNeeded;
      speed = baseWidth / speedSeconds;
      x = 0;
    }

    function tick(time) {
      if (!lastTime) lastTime = time;
      var delta = (time - lastTime) / 1000;
      lastTime = time;

      if (sequenceWidth > 0) {
        x += speed * delta;
        if (x >= sequenceWidth) {
          x -= sequenceWidth;
        }
        track.style.transform = "translate3d(" + x + "px,0,0)";
      }

      rafId = window.requestAnimationFrame(tick);
    }

    function restart() {
      if (rafId) window.cancelAnimationFrame(rafId);
      lastTime = 0;
      setup();
      rafId = window.requestAnimationFrame(tick);
    }

    restart();

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(restart, 150);
    });

    window.addEventListener("load", restart);
  }

  function initAll() {
    document
      .querySelectorAll('[data-section="about-snake-bar"].snake-bar')
      .forEach(init);
  }

  window.__ananasSection_about_snake_bar = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
