/*
 * sections/star-reviews.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_star_reviews === "function") {
    window.__ananasSection_star_reviews();
    return;
  }

  function init(sr) {
    if (!sr || sr.getAttribute("data-section-ready") === "true") return;
    sr.setAttribute("data-section-ready", "true");

    var prev = document.querySelector(".about-details");
    if (!prev) return;

    if (!(prev.compareDocumentPosition(sr) & Node.DOCUMENT_POSITION_FOLLOWING))
      return;

    function applyEffect() {
      var isDesktop = window.innerWidth >= 992;

      if (isDesktop) {
        prev.style.position = "sticky";
        prev.style.top = "0";
        prev.style.zIndex = "1";
        prev.style.overflow = "hidden";
      } else {
        prev.style.position = "";
        prev.style.top = "";
        prev.style.zIndex = "";
        prev.style.overflow = "";
      }

      var allSections = document.querySelectorAll("[section-id]");
      var found = false;
      allSections.forEach(function (sec) {
        if (found) {
          sec.style.position = isDesktop ? "relative" : "";
          sec.style.zIndex = isDesktop ? "2" : "";
        }
        if (sec === sr) found = true;
      });
    }

    // The pinned section stays sticky until the end of the page; once the section after
    // it has scrolled past, hide it so transparent sections further down don't show it.
    var nextSection = null;
    var all = document.querySelectorAll("[section-id]");
    for (var i = 0; i < all.length; i++) {
      if (all[i] === prev && all[i + 1]) nextSection = all[i + 1];
    }
    var ticking = false;
    function updateVisibility() {
      ticking = false;
      if (!nextSection || window.innerWidth < 992) {
        prev.style.visibility = "";
        return;
      }
      var passed = nextSection.getBoundingClientRect().bottom <= 0;
      prev.style.visibility = passed ? "hidden" : "";
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateVisibility);
    }

    applyEffect();
    updateVisibility();
    window.addEventListener("resize", function () {
      applyEffect();
      updateVisibility();
    });
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initAll() {
    document
      .querySelectorAll('[data-section="star-reviews"].section-star-reviews')
      .forEach(init);
  }

  window.__ananasSection_star_reviews = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
