/*
 * sections/about-gallery.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_about_gallery === "function") {
    window.__ananasSection_about_gallery();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");
    section.querySelectorAll(".ag-media-cell").forEach(function (cell) {
      var btn = cell.querySelector(".ag-play-btn");
      var video = cell.querySelector(".ag-video");
      if (!btn || !video) return;
      btn.addEventListener("click", function () {
        if (video.paused) {
          video.play();
          cell.classList.add("is-playing");
        } else {
          video.pause();
          cell.classList.remove("is-playing");
        }
      });
      video.addEventListener("ended", function () {
        cell.classList.remove("is-playing");
      });
    });
  }

  function initAll() {
    document.querySelectorAll('[data-section="about-gallery"]').forEach(init);
  }

  window.__ananasSection_about_gallery = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
