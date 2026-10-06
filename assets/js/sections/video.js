/*
 * sections/video.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_video === "function") {
    window.__ananasSection_video();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    const video = section.querySelector("video");
    const overlay = section.querySelector(".video-overlay");
    const playButton = section.querySelector(".play-button");

    if (playButton && video && overlay) {
      playButton.addEventListener("click", function () {
        video.play();
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.style.display = "none";
        }, 500);
      });
    }
  }

  function initAll() {
    document.querySelectorAll('[data-section="video"]').forEach(init);
  }

  window.__ananasSection_video = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
