/*
 * sections/countdown.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_countdown === "function") {
    window.__ananasSection_countdown();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    const endDate = new Date(
      section.getAttribute("data-end-date") || "",
    ).getTime();
    const daysEl = section.querySelector(".days-value");
    const hoursEl = section.querySelector(".hours-value");
    const minutesEl = section.querySelector(".minutes-value");
    const secondsEl = section.querySelector(".seconds-value");
    const contentEl = section.querySelector(".countdown-content");

    if (!endDate || isNaN(endDate) || endDate <= new Date().getTime()) {
      contentEl.style.display = "none";
      return;
    }

    function updateCountdown() {
      const now = new Date().getTime();
      const distance = endDate - now;

      if (distance < 0) {
        if (interval) clearInterval(interval);
        section.style.display = "none";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      daysEl.textContent = String(days).padStart(2, "0");
      hoursEl.textContent = String(hours).padStart(2, "0");
      minutesEl.textContent = String(minutes).padStart(2, "0");
      secondsEl.textContent = String(seconds).padStart(2, "0");
    }

    let interval;
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
  }

  function initAll() {
    document.querySelectorAll('[data-section="countdown"]').forEach(init);
  }

  window.__ananasSection_countdown = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
