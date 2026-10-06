/*
 * sections/about-reviews-featured.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_about_reviews_featured === "function") {
    window.__ananasSection_about_reviews_featured();
    return;
  }

  function init(root) {
    if (!root || root.getAttribute("data-section-ready") === "true") return;
    root.setAttribute("data-section-ready", "true");

    var dataNode = root.querySelector("[data-arf-data]");
    var reviews = [];
    try {
      reviews = JSON.parse(dataNode ? dataNode.textContent : "[]");
    } catch (error) {
      reviews = [];
    }

    if (!reviews.length) return;

    var active = 0;
    var carousels = root.querySelectorAll("[data-arf-carousel]");
    var isAnimating = false;
    var swapTimer = null;
    var cleanupTimer = null;

    function renderStars(count) {
      var total = Math.max(1, Math.min(5, parseInt(count, 10) || 5));
      return Array.from({ length: total })
        .map(function () {
          return '<svg width="18" height="18" viewBox="0 0 20 20" fill="#F7A52D" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>';
        })
        .join("");
    }

    function updateCarousel(carousel, animate) {
      var review = reviews[active];
      var nextOne = reviews[(active + 1) % reviews.length] || review;
      var nextTwo = reviews[(active + 2) % reviews.length] || review;
      var text = carousel.querySelector("[data-arf-text]");
      var name = carousel.querySelector("[data-arf-name]");
      var avatar = carousel.querySelector(".arf-featured-card__avatar");
      var dots = carousel.querySelectorAll("[data-arf-dot]");
      var stars = carousel.querySelector(".arf-featured-card__body .arf-stars");
      var deck = carousel.querySelector(".arf-deck");

      if (text) text.textContent = review.text;
      if (name) name.textContent = review.name;
      if (avatar) {
        if (review.avatar) {
          avatar.src = review.avatar;
          avatar.hidden = false;
        } else {
          avatar.hidden = true;
        }
      }
      if (deck) {
        deck.style.setProperty(
          "--arf-front-bg",
          review.backgroundColor || "#E2E899",
        );
        deck.style.setProperty(
          "--arf-front-color",
          review.textColor || "#000000",
        );
        deck.style.setProperty(
          "--arf-back-one-bg",
          nextOne.backgroundColor || "#239C5C",
        );
        deck.style.setProperty(
          "--arf-back-two-bg",
          nextTwo.backgroundColor || "#E2E899",
        );
      }
      if (stars) stars.innerHTML = renderStars(review.stars);

      dots.forEach(function (dot, index) {
        var isActive = index === active;
        dot.classList.toggle("arf-dot--active", isActive);
        dot.setAttribute("aria-current", isActive ? "true" : "false");
      });

      if (animate && deck) {
        deck.classList.remove("arf-deck--animate");
        void deck.offsetWidth;
        deck.classList.add("arf-deck--animate");
      }
    }

    function addClickRipple(carousel, event) {
      if (!event) return;
      var rect = carousel.getBoundingClientRect();
      var point = event.changedTouches ? event.changedTouches[0] : event;
      var x =
        typeof point.clientX === "number"
          ? point.clientX - rect.left
          : rect.width / 2;
      var y =
        typeof point.clientY === "number"
          ? point.clientY - rect.top
          : rect.height / 2;
      var ripple = document.createElement("span");
      ripple.className = "arf-click-ripple";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";
      carousel.appendChild(ripple);
      window.setTimeout(function () {
        ripple.remove();
      }, 560);
    }

    function setActive(next, animate, event) {
      if (reviews.length <= 1) return;

      var nextIndex = (next + reviews.length) % reviews.length;

      if (!animate) {
        active = nextIndex;
        carousels.forEach(function (carousel) {
          updateCarousel(carousel, false);
        });
        return;
      }

      isAnimating = true;
      window.clearTimeout(swapTimer);
      window.clearTimeout(cleanupTimer);

      carousels.forEach(function (carousel) {
        var deck = carousel.querySelector(".arf-deck");
        if (deck) {
          deck.classList.remove("arf-deck--animate");
          void deck.offsetWidth;
          deck.classList.add("arf-deck--animate");
        }
      });

      addClickRipple(
        event && event.currentTarget ? event.currentTarget : null,
        event,
      );
      active = nextIndex;

      swapTimer = window.setTimeout(function () {
        carousels.forEach(function (carousel) {
          updateCarousel(carousel, false);
        });
      }, 145);

      cleanupTimer = window.setTimeout(function () {
        carousels.forEach(function (carousel) {
          var deck = carousel.querySelector(".arf-deck");
          if (deck) deck.classList.remove("arf-deck--animate");
        });
        isAnimating = false;
      }, 440);
    }

    carousels.forEach(function (carousel) {
      var startX = 0;

      carousel.querySelectorAll("[data-arf-arrow]").forEach(function (arrow) {
        arrow.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          var direction = arrow.getAttribute("data-arf-arrow");
          setActive(active + (direction === "next" ? 1 : -1), true, event);
        });
      });

      carousel.addEventListener("click", function (event) {
        var dot =
          event.target && event.target.closest
            ? event.target.closest("[data-arf-dot]")
            : null;
        if (dot) {
          setActive(
            parseInt(dot.getAttribute("data-arf-dot"), 10),
            true,
            event,
          );
          return;
        }
        setActive(active + 1, true, event);
      });

      carousel.addEventListener("keydown", function (event) {
        var control =
          event.target && event.target.closest
            ? event.target.closest("[data-arf-arrow], [data-arf-dot]")
            : null;
        if (control) return;

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setActive(active + 1, true, event);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setActive(active - 1, true, event);
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActive(active + 1, true, event);
        }
      });

      carousel.addEventListener(
        "touchstart",
        function (event) {
          startX = event.changedTouches[0].clientX;
        },
        { passive: true },
      );

      carousel.addEventListener(
        "touchend",
        function (event) {
          var delta = event.changedTouches[0].clientX - startX;
          if (Math.abs(delta) < 32) return;
          setActive(active + (delta < 0 ? 1 : -1), true, event);
        },
        { passive: true },
      );

      updateCarousel(carousel, false);
    });
  }

  function initAll() {
    document
      .querySelectorAll('[data-section="about-reviews-featured"].section-arf')
      .forEach(init);
  }

  window.__ananasSection_about_reviews_featured = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
