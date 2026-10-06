/*
 * sections/products-normal.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_products_normal === "function") {
    window.__ananasSection_products_normal();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    var panels = section.querySelectorAll("[data-fp-panel]");
    var mobilePrev = section.querySelector("[data-fp-mobile-prev]");
    var mobileNext = section.querySelector("[data-fp-mobile-next]");

    function alignCarousel(panel) {
      var viewport = panel && panel.querySelector(".fp-carousel__viewport");
      if (!viewport) return;

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          viewport.scrollLeft = viewport.scrollWidth;
          updateProgress(panel);
          viewport.classList.add("is-ready");
        });
      });
    }

    function updateProgress(panel) {
      var currentPanel =
        panel || section.querySelector("[data-fp-panel]:not(.is-hidden)");
      if (!currentPanel) return;

      var viewport = currentPanel.querySelector(".fp-carousel__viewport");
      var progress = currentPanel.querySelector(".fp-progress");
      var bar = progress && progress.querySelector(".fp-progress__bar");

      if (!viewport || !progress || !bar) return;

      var maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      var trackWidth = progress.clientWidth;

      if (maxScroll <= 1) {
        progress.style.display = "none";
        return;
      } else {
        progress.style.display = "block";
      }

      var visibleRatio = Math.max(
        0,
        Math.min(1, viewport.clientWidth / viewport.scrollWidth),
      );

      var barWidth = Math.max(32, Math.round(trackWidth * visibleRatio));

      var isRTL = document.documentElement.dir === "rtl";

      var currentScroll = Math.abs(viewport.scrollLeft);

      var scrollRatio = Math.max(0, Math.min(1, currentScroll / maxScroll));

      var maxTravel = Math.max(0, trackWidth - barWidth);

      var translate = Math.round(maxTravel * scrollRatio);

      bar.style.width = barWidth + "px";

      if (isRTL) {
        bar.style.transform = "translateX(" + -translate + "px)";
      } else {
        bar.style.transform = "translateX(" + translate + "px)";
      }
    }
    function bindCarouselProgress(panel) {
      var viewport = panel && panel.querySelector(".fp-carousel__viewport");
      if (!viewport || viewport.dataset.fpProgressBound === "true") return;

      viewport.dataset.fpProgressBound = "true";
      viewport.addEventListener(
        "scroll",
        function () {
          updateProgress(panel);
        },
        { passive: true },
      );
    }

    function initDragToScroll(viewport) {
      if (!viewport || viewport.dataset.dragInitialized === "true") return;
      viewport.dataset.dragInitialized = "true";

      var isDown = false;
      var startX;
      var scrollLeft;
      var moved = false;

      viewport.addEventListener("mousedown", function (e) {
        if (e.target.closest("button, a")) return;
        isDown = true;
        moved = false;
        viewport.classList.add("is-dragging");
        startX = e.pageX - viewport.offsetLeft;
        scrollLeft = viewport.scrollLeft;
      });

      viewport.addEventListener("mouseleave", function () {
        if (!isDown) return;
        isDown = false;
        moved = false;
        viewport.classList.remove("is-dragging");
      });

      viewport.addEventListener("mouseup", function (e) {
        if (!isDown) return;
        isDown = false;
        viewport.classList.remove("is-dragging");
        setTimeout(function () {
          moved = false;
        }, 0);
      });

      viewport.addEventListener("mousemove", function (e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - viewport.offsetLeft;
        var walk = x - startX;
        if (Math.abs(walk) > 5) {
          moved = true;
        }
        viewport.scrollLeft = scrollLeft - walk;
      });

      // Prevent clicks on links/buttons if we dragged
      viewport.addEventListener(
        "click",
        function (e) {
          if (moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );
    }

    panels.forEach(function (panel) {
      var viewport = panel.querySelector(".fp-carousel__viewport");
      if (viewport) {
        initDragToScroll(viewport);
      }
      bindCarouselProgress(panel);
      if (!panel.classList.contains("is-hidden")) {
        alignCarousel(panel);
        updateProgress(panel);
      }
    });

    function moveMobileCarousel(step) {
      var currentPanel = section.querySelector(
        "[data-fp-panel]:not(.is-hidden)",
      );
      var viewport =
        currentPanel && currentPanel.querySelector(".fp-carousel__viewport");
      if (!viewport) return;

      var slide = viewport.querySelector(".fp-carousel__slide");
      var slideWidth = slide
        ? slide.getBoundingClientRect().width
        : viewport.clientWidth * 0.8;
      var amount = Math.max(120, Math.round(slideWidth + 16));
      var isRTL = document.documentElement.dir === "rtl";

      viewport.scrollBy({
        left: (isRTL ? -step : step) * amount,
        behavior: "smooth",
      });
    }

    if (mobilePrev) {
      mobilePrev.addEventListener("click", function () {
        moveMobileCarousel(-1);
      });
    }

    if (mobileNext) {
      mobileNext.addEventListener("click", function () {
        moveMobileCarousel(1);
      });
    }

    window.addEventListener(
      "resize",
      function () {
        updateProgress();
      },
      { passive: true },
    );

    setTimeout(function () {
      section.querySelectorAll(".fp-carousel__viewport").forEach(function (v) {
        v.classList.add("is-ready");
      });
    }, 600);
  }

  function initAll() {
    document
      .querySelectorAll('[data-section="products-normal"][data-fp-section]')
      .forEach(init);
  }

  window.__ananasSection_products_normal = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
