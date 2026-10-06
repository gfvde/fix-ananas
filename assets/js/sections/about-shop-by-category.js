/*
 * sections/about-shop-by-category.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_about_shop_by_category === "function") {
    window.__ananasSection_about_shop_by_category();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    if (!section || section.dataset.scrollEffect !== "true") return;
    if (section.dataset.sbcParallaxBound === "true") return;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    section.dataset.sbcParallaxBound = "true";

    var cards = Array.prototype.slice.call(
      section.querySelectorAll("[data-sbc-parallax-card]"),
    );
    var strength = parseFloat(section.dataset.scrollStrength || "18");
    var ticking = false;

    function update() {
      var viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;

      cards.forEach(function (card) {
        var img = card.querySelector("[data-sbc-parallax-img]");
        if (!img) return;

        var rect = card.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > viewportHeight + 120) return;

        var cardCenter = rect.top + rect.height / 2;
        var progress =
          (cardCenter - viewportHeight / 2) /
          (viewportHeight / 2 + rect.height / 2);
        var clamped = Math.max(-1, Math.min(1, progress));
        var y = clamped * strength * -1;

        img.style.setProperty("--sbc-parallax-y", y.toFixed(2) + "px");
      });

      ticking = false;
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    document.addEventListener("theme:resize", requestUpdate);
  }

  function initAll() {
    document
      .querySelectorAll(
        '[data-section="about-shop-by-category"].shop-by-category',
      )
      .forEach(init);
  }

  window.__ananasSection_about_shop_by_category = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
