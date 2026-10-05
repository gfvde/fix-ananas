/**
 * Product Gallery Module — Swiper v11 (CDN bundle)
 *
 * Single initializer for `.pg-wrapper[data-gallery-id]` galleries rendered by
 * components/products/product-gallery.jinja.
 *
 * Swiper is NOT bundled into theme.js. The PDP loads the full CDN
 * `swiper-bundle` (all modules included). When a gallery appears on a page
 * without it (e.g. quick view injected on a listing page), the bundle is
 * loaded on demand.
 *
 * Every listener registered for a gallery is bound to an AbortController that
 * is aborted in destroy(), so re-initialization never stacks handlers.
 */

const SWIPER_VERSION = "11";
const SWIPER_JS = `https://cdn.jsdelivr.net/npm/swiper@${SWIPER_VERSION}/swiper-bundle.min.js`;
const SWIPER_CSS = `https://cdn.jsdelivr.net/npm/swiper@${SWIPER_VERSION}/swiper-bundle.min.css`;

/* ============================================================
   Swiper loader
   ============================================================ */
let swiperPromise = null;

function ensureSwiper() {
  if (typeof window.Swiper === "function") return Promise.resolve(window.Swiper);
  if (swiperPromise) return swiperPromise;

  swiperPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href*="swiper-bundle"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SWIPER_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src*="swiper-bundle"]`);
    const script = existing || document.createElement("script");
    const done = () => (typeof window.Swiper === "function" ? resolve(window.Swiper) : reject(new Error("Swiper unavailable")));

    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("Swiper failed to load")), { once: true });

    if (!existing) {
      script.src = SWIPER_JS;
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((err) => {
    swiperPromise = null;
    console.error("[Gallery]", err);
    throw err;
  });

  return swiperPromise;
}

/* ============================================================
   Video helpers
   ============================================================ */
function getYouTubeEmbedUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== "string") return null;
  const m = videoUrl.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|.*[?&]v=)|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&enablejsapi=1` : null;
}

function showVideo(playButton) {
  const slide = playButton.closest(".pg-main__slide");
  const container = slide?.querySelector("[data-video-container]");
  const iframe = container?.querySelector("iframe");
  const src = playButton.getAttribute("data-video-src");
  if (!container || !iframe || !src) return;

  iframe.src = getYouTubeEmbedUrl(src) || src;
  container.classList.remove("hidden");
  playButton.classList.add("hidden");
}

function hideVideo(closeButton) {
  const container = closeButton.closest("[data-video-container]");
  const slide = closeButton.closest(".pg-main__slide");
  const iframe = container?.querySelector("iframe");
  const playBtn = slide?.querySelector("[data-video-play]");

  if (iframe) iframe.src = "";
  if (container) container.classList.add("hidden");
  if (playBtn) playBtn.classList.remove("hidden");
}

function stopAllVideos(galleryNode) {
  galleryNode?.querySelectorAll("[data-video-container]").forEach((c) => {
    const iframe = c.querySelector("iframe");
    const playBtn = c.closest(".pg-main__slide")?.querySelector("[data-video-play]");
    if (iframe && iframe.src) iframe.src = "";
    c.classList.add("hidden");
    if (playBtn) playBtn.classList.remove("hidden");
  });
}

/* ============================================================
   Build Swipers
   ============================================================ */
function buildSwiperInstances(Swiper, galleryId) {
  const wrapper = document.getElementById(`${galleryId}-wrapper`);
  if (!wrapper) return null;

  const controller = new AbortController();
  const { signal } = controller;

  const thumbLayout = wrapper.dataset.thumbLayout || "vertical";
  const loop = wrapper.dataset.loop === "true";
  const keyboard = wrapper.dataset.keyboard !== "false";
  const autoplay = wrapper.dataset.autoplay === "true";

  const mainEl = document.getElementById(`${galleryId}-swiper-main`);
  if (!mainEl) return null;
  const mediaCount = mainEl.querySelectorAll(".swiper-slide").length;
  const multiple = mediaCount > 1;

  const thumbsVEl = document.getElementById(`${galleryId}-swiper-thumbs-v`);
  const thumbsHEl = document.getElementById(`${galleryId}-swiper-thumbs-h`);

  let mainSwiper = null;
  let thumbsVSwiper = null;
  let thumbsHSwiper = null;

  if (thumbsVEl && multiple) {
    thumbsVSwiper = new Swiper(thumbsVEl, {
      direction: "vertical",
      slidesPerView: 7,
      spaceBetween: 8,
      freeMode: true,
      watchSlidesProgress: true,
      observer: true,
      observeParents: true,
      breakpoints: {
        0: { slidesPerView: 5, spaceBetween: 6, direction: "horizontal" },
        1024: { slidesPerView: 7, spaceBetween: 8, direction: "vertical" }
      }
    });
  }

  if (thumbsHEl && multiple) {
    thumbsHSwiper = new Swiper(thumbsHEl, {
      direction: "horizontal",
      slidesPerView: 5,
      spaceBetween: 8,
      freeMode: true,
      watchSlidesProgress: true,
      observer: true,
      observeParents: true,
      breakpoints: {
        0: { slidesPerView: 5, spaceBetween: 6 },
        768: { slidesPerView: 6, spaceBetween: 8 },
        1024: { slidesPerView: 7, spaceBetween: 10 }
      }
    });
  }

  // Vertical thumb arrows step the main image (thumbs follow via syncThumbs)
  const bindArrow = (id, dir) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        if (!mainSwiper || mainSwiper.destroyed) return;
        dir < 0 ? mainSwiper.slidePrev() : mainSwiper.slideNext();
      },
      { signal }
    );
  };
  bindArrow(`${galleryId}-thumbs-v-prev`, -1);
  bindArrow(`${galleryId}-thumbs-v-next`, 1);
  bindArrow(`${galleryId}-thumbs-h-prev`, -1);
  bindArrow(`${galleryId}-thumbs-h-next`, 1);

  function syncThumbs(index, speed = 300) {
    [thumbsVSwiper, thumbsHSwiper].forEach((thumbs) => {
      if (!thumbs || thumbs.destroyed) return;
      thumbs.slideTo(index, speed, false);
      thumbs.slides.forEach((slide, i) => {
        slide.classList.toggle("swiper-slide-thumb-active", i === index);
        if (i === index) slide.setAttribute("aria-current", "true");
        else slide.removeAttribute("aria-current");
      });
    });
  }

  const progressBar = document.getElementById(`${galleryId}-progress-bar`);
  function updateProgress(swiper) {
    if (!progressBar || !swiper || swiper.destroyed) return;
    const total = Math.max(mediaCount - 1, 1);
    const pct = Math.min(Math.max(swiper.realIndex / total, 0), 1) * 100;
    progressBar.style.transition = "width 0.3s ease-out";
    progressBar.style.width = `${pct}%`;
  }

  const mainPrevEl = document.getElementById(`${galleryId}-main-prev`);
  const mainNextEl = document.getElementById(`${galleryId}-main-next`);

  const mainConfig = {
    observer: true,
    observeParents: true,
    loop: loop && multiple,
    spaceBetween: 10,
    slidesPerView: 1,
    speed: 400,
    keyboard: keyboard ? { enabled: true, onlyInViewport: true } : false,
    on: {
      init(swiper) {
        updateProgress(swiper);
        syncThumbs(swiper.realIndex, 0);
      },
      slideChange(swiper) {
        updateProgress(swiper);
        syncThumbs(swiper.realIndex);
      },
      slideChangeTransitionStart() {
        stopAllVideos(wrapper);
      }
    }
  };

  if (multiple && mainPrevEl && mainNextEl) {
    mainConfig.navigation = { prevEl: mainPrevEl, nextEl: mainNextEl };
  }

  if (autoplay && multiple) {
    mainConfig.autoplay = { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true };
  }

  try {
    mainSwiper = new Swiper(mainEl, mainConfig);
  } catch (error) {
    console.error("[Gallery] Main swiper error:", error);
    controller.abort();
    thumbsVSwiper?.destroy(true, true);
    thumbsHSwiper?.destroy(true, true);
    return null;
  }

  // Video play / close (delegated once per init, removed on destroy)
  wrapper.addEventListener(
    "click",
    (e) => {
      const play = e.target.closest("[data-video-play]");
      if (play) {
        e.preventDefault();
        e.stopPropagation();
        showVideo(play);
        return;
      }
      const close = e.target.closest("[data-video-close]");
      if (close) {
        e.preventDefault();
        e.stopPropagation();
        hideVideo(close);
      }
    },
    { signal }
  );

  // Thumb click / keyboard → main slide
  function goToThumb(container, target) {
    const slide = target.closest(".swiper-slide");
    if (!slide || !mainSwiper || mainSwiper.destroyed) return false;
    const idx = Array.from(container.querySelectorAll(".swiper-slide")).indexOf(slide);
    if (idx === -1) return false;
    if (mainSwiper.params.loop) mainSwiper.slideToLoop(idx);
    else mainSwiper.slideTo(idx);
    return true;
  }

  [thumbsVEl, thumbsHEl].forEach((container) => {
    if (!container) return;
    container.addEventListener("click", (e) => goToThumb(container, e.target), { signal });
    container.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (goToThumb(container, e.target)) e.preventDefault();
      },
      { signal }
    );
  });

  return {
    wrapper,
    main: mainSwiper,
    thumbsV: thumbsVSwiper,
    thumbsH: thumbsHSwiper,
    layout: thumbLayout,
    destroy() {
      controller.abort();
      stopAllVideos(wrapper);
      if (mainSwiper && !mainSwiper.destroyed) mainSwiper.destroy(true, true);
      if (thumbsVSwiper && !thumbsVSwiper.destroyed) thumbsVSwiper.destroy(true, true);
      if (thumbsHSwiper && !thumbsHSwiper.destroyed) thumbsHSwiper.destroy(true, true);
    }
  };
}

/* ============================================================
   Store
   ============================================================ */
const instances = (window.__pgInstances = window.__pgInstances || {});
let initSeq = 0;

/* ============================================================
   Public APIs
   ============================================================ */

/**
 * (Re)initialize a gallery. Always destroys any previous instance first.
 * @param {string} galleryId
 */
export function initProductGallery(galleryId) {
  if (!galleryId) return Promise.resolve(null);

  destroyProductGallery(galleryId);
  const wrapper = document.getElementById(`${galleryId}-wrapper`);
  if (!wrapper) return Promise.resolve(null);
  const token = `pending-${++initSeq}`;
  wrapper.dataset.pgInit = token;

  return ensureSwiper()
    .then((Swiper) => {
      // A newer init (or removal) may have happened while loading
      if (!wrapper.isConnected || wrapper.dataset.pgInit !== token) return null;
      const inst = buildSwiperInstances(Swiper, galleryId);
      if (inst) {
        instances[galleryId] = inst;
        wrapper.dataset.pgInit = "true";
      } else {
        delete wrapper.dataset.pgInit;
      }
      return inst;
    })
    .catch(() => {
      if (wrapper.dataset.pgInit === token) delete wrapper.dataset.pgInit;
      return null;
    });
}

export function destroyProductGallery(galleryId) {
  const inst = instances[galleryId];
  if (!inst) return;
  inst.destroy?.();
  if (inst.wrapper) delete inst.wrapper.dataset.pgInit;
  delete instances[galleryId];
}

/**
 * Initialize every gallery on the page that is not initialized yet.
 * Safe to call repeatedly (DOMContentLoaded, content:loaded, …).
 */
export function initAllProductGalleries() {
  // Drop instances whose DOM was removed (e.g. quick view closed)
  Object.keys(instances).forEach((id) => {
    if (!instances[id].wrapper?.isConnected) destroyProductGallery(id);
  });

  document.querySelectorAll(".pg-wrapper[data-gallery-id]").forEach((el) => {
    if (el.dataset.pgInit) return;
    const id = el.getAttribute("data-gallery-id");
    if (id) initProductGallery(id);
  });
}

/* ============================================================
   Window aliases
   ============================================================ */
window.initProductGallery = initProductGallery;
window.destroyProductGallery = destroyProductGallery;
window.initAllProductGalleries = initAllProductGalleries;
