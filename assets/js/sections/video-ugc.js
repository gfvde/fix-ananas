/*
 * sections/video-ugc.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded`.
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_video_ugc === "function") {
    window.__ananasSection_video_ugc();
    return;
  }

  function initVideoUGC(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    var cards = section.querySelectorAll(".video-ugc__card");
    cards.forEach(function (card) {
      var btn = card.querySelector(".video-ugc__play-btn");
      if (!btn) return;

      // Get the video URL from the closest slide or card container
      var container = card.closest("[data-video-url]") || card;
      var url = container.getAttribute("data-video-url") || "";
      if (!url) url = card.getAttribute("data-video-url") || "";

      btn.addEventListener("click", function () {
        var thumb = card.querySelector(".video-ugc__thumb");
        var player = card.querySelector(".video-ugc__player");
        if (!thumb || !player || !url) return;

        var existingVideo = player.querySelector("video");
        if (existingVideo) {
          if (existingVideo.paused) {
            existingVideo.play();
            btn.style.opacity = "0";
          } else {
            existingVideo.pause();
            btn.style.opacity = "1";
          }
          return;
        }

        thumb.style.display = "none";
        player.style.display = "block";
        btn.style.opacity = "0";
        player.innerHTML =
          '<video src="' +
          url +
          '" autoplay playsinline style="width:100%;height:100%;object-fit:cover;display:block;"></video>';

        var video = player.querySelector("video");
        video.addEventListener("pause", function () {
          btn.style.opacity = "1";
        });
        video.addEventListener("play", function () {
          btn.style.opacity = "0";
        });
        video.addEventListener("click", function (e) {
          e.stopPropagation();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        });
      });
    });
  }

  function initAll() {
    document.querySelectorAll(".section-video-ugc").forEach(initVideoUGC);
  }

  window.__ananasSection_video_ugc = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
