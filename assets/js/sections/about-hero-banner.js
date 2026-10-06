/*
 * sections/about-hero-banner.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_about_hero_banner === "function") {
    window.__ananasSection_about_hero_banner();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    if (!section || section.dataset.ahbRatingScrollBound === "true") return;

    var rating = section.querySelector("[data-ahb-rating-scroll-target]");
    if (!rating) return;

    section.dataset.ahbRatingScrollBound = "true";

    var targets = {
      about_reviews_featured: ".section-arf",
      star_reviews: ".section-star-reviews",
    };

    function scrollToSelectedSection() {
      var selector =
        targets[rating.dataset.ahbRatingScrollTarget] ||
        targets.about_reviews_featured;
      var target = document.querySelector(selector);
      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    rating.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      scrollToSelectedSection();
    });
    rating.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      scrollToSelectedSection();
    });
  }

  function initAll() {
    document
      .querySelectorAll('[data-section="about-hero-banner"].about-hero-banner')
      .forEach(init);
  }

  window.__ananasSection_about_hero_banner = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
