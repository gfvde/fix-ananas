/*
 * sections/about-community.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_about_community === "function") {
    window.__ananasSection_about_community();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    section
      .querySelectorAll("[data-ac-video-trigger]")
      .forEach(function (trigger) {
        var video = trigger.querySelector("video");
        var overlay = trigger.querySelector("[data-ac-video-overlay]");
        if (!video) return;

        trigger.addEventListener("click", function () {
          if (video.paused) {
            video.play();
            trigger.classList.add("ac-video--playing");
            if (overlay) overlay.style.opacity = "0";
          } else {
            video.pause();
            trigger.classList.remove("ac-video--playing");
            if (overlay) overlay.style.opacity = "1";
          }
        });

        video.addEventListener("ended", function () {
          trigger.classList.remove("ac-video--playing");
          if (overlay) overlay.style.opacity = "1";
        });
      });
  }

  function initAll() {
    document
      .querySelectorAll(
        '[data-section="about-community"].section-about-community',
      )
      .forEach(init);
  }

  window.__ananasSection_about_community = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
