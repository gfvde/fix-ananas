/**
 * Product Gallery Module — Swiper v11 (FIXED & DEBUGGED)
 * FIX: Enhanced loop synchronization for thumb active state
 */

/* ============================================================
   YouTube embed helper
   ============================================================ */
function getYouTubeEmbedUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== "string") return null;
  const m = videoUrl.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|.*[?&]v=)|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&enablejsapi=1` : null;
}

/* ============================================================
   Video helpers
   ============================================================ */
function showVideo(playButton) {
  const slide = playButton.closest(".pg-main__slide");
  if (!slide) return;

  const container = slide.querySelector("[data-video-container]");
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
  if (!galleryNode) return;
  galleryNode.querySelectorAll("[data-video-container]").forEach((c) => {
    const iframe = c.querySelector("iframe");
    const slide = c.closest(".pg-main__slide");
    const playBtn = slide?.querySelector("[data-video-play]");

    if (iframe) iframe.src = "";
    c.classList.add("hidden");
    if (playBtn) playBtn.classList.remove("hidden");
  });
}

/* ============================================================
   Wait for Swiper (with better error handling)
   ============================================================ */
function waitForSwiper(cb) {
  if (typeof Swiper !== "undefined") {
    cb();
    return;
  }

  let tries = 0;
  const maxTries = 100;
  const t = setInterval(() => {
    if (typeof Swiper !== "undefined") {
      clearInterval(t);
      cb();
    } else if (++tries >= maxTries) {
      clearInterval(t);
      console.error("❌ Swiper failed to load after 5 seconds");
    }
  }, 50);
}

/* ============================================================
   Build Swipers - FIXED VERSION with Enhanced Sync
   ============================================================ */

function buildSwiperInstances(galleryId) {
  // 🔍 Validate elements exist
  const wrapper = document.getElementById(`${galleryId}-wrapper`);
  if (!wrapper) {
    console.error(`❌ Wrapper not found: ${galleryId}-wrapper`);
    return null;
  }

  const thumbLayout = wrapper.dataset.thumbLayout || "vertical";
  const loop = wrapper.dataset.loop === "true";
  const keyboard = wrapper.dataset.keyboard === "true";
  const autoplay = wrapper.dataset.autoplay === "true";

  const slides = wrapper.querySelectorAll(`#${galleryId}-swiper-main .swiper-slide`);
  const mediaCount = slides.length;

  console.log(`📊 Gallery ${galleryId}: ${mediaCount} slides, layout: ${thumbLayout}, loop: ${loop}, autoplay: ${autoplay}`);

  /* ── Vertical Thumbs ───────────────── */
  let thumbsVSwiper = null;
  const thumbsVEl = document.getElementById(`${galleryId}-swiper-thumbs-v`);

  if (thumbsVEl && mediaCount > 1) {
    try {
      thumbsVSwiper = new Swiper(`#${galleryId}-swiper-thumbs-v`, {
        direction: "vertical",
        slidesPerView: 7,
        spaceBetween: 8,
        watchSlidesProgress: true,
        observer: true,
        observeParents: true,
        navigation: {
          prevEl: `#${galleryId}-thumbs-v-prev`,
          nextEl: `#${galleryId}-thumbs-v-next`
        },
        breakpoints: {
          0: {
            slidesPerView: 5,
            spaceBetween: 6,
            direction: "horizontal"
          },
          1024: {
            slidesPerView: 7,
            spaceBetween: 8,
            direction: "vertical"
          }
        }
      });
      const vPrev = document.getElementById(`${galleryId}-thumbs-v-prev`);
      const vNext = document.getElementById(`${galleryId}-thumbs-v-next`);
      
      if (vPrev && vNext) {
        vPrev.onclick = () => {
          if (mainSwiper && !mainSwiper.destroyed) {
            mainSwiper.slidePrev();
          } else {
            thumbsVSwiper.slidePrev();
          }
        };
        vNext.onclick = () => {
          if (mainSwiper && !mainSwiper.destroyed) {
            mainSwiper.slideNext();
          } else {
            thumbsVSwiper.slideNext();
          }
        };
        console.log("🛠 Vertical Thumbs manual bridge established (Synced)");
      }
      console.log("✅ Vertical thumbs initialized");
    } catch (error) {
      console.error("❌ Vertical thumbs error:", error);
    }
  }

  /* ── Horizontal Thumbs ─────────────── */
  let thumbsHSwiper = null;
  const thumbsHEl = document.getElementById(`${galleryId}-swiper-thumbs-h`);

  if (thumbsHEl && mediaCount > 1) {
    try {
      thumbsHSwiper = new Swiper(`#${galleryId}-swiper-thumbs-h`, {
        direction: "horizontal",
        slidesPerView: 5,
        spaceBetween: 8,
        watchSlidesProgress: true,
        observer: true,
        observeParents: true,
        breakpoints: {
          0: { slidesPerView: 5, spaceBetween: 6 },
          768: { slidesPerView: 6, spaceBetween: 8 },
          1024: { slidesPerView: 7, spaceBetween: 10 }
        }
      });
      const hPrev = document.getElementById(`${galleryId}-thumbs-h-prev`);
      const hNext = document.getElementById(`${galleryId}-thumbs-h-next`);
      
      if (hPrev && hNext) {
        hPrev.onclick = () => {
          if (mainSwiper && !mainSwiper.destroyed) {
            mainSwiper.slidePrev();
          } else {
            thumbsHSwiper.slidePrev();
          }
        };
        hNext.onclick = () => {
          if (mainSwiper && !mainSwiper.destroyed) {
            mainSwiper.slideNext();
          } else {
            thumbsHSwiper.slideNext();
          }
        };
        console.log("🛠 Horizontal Thumbs manual bridge established (Synced)");
      }
      console.log("✅ Horizontal thumbs initialized");
    } catch (error) {
      console.error("❌ Horizontal thumbs error:", error);
    }
  }

  /* ── Active thumbs selector ─────────────────── */
  function getActiveThumbsSwiper() {
    const desktop = window.innerWidth >= 1024;
    if (desktop && thumbLayout === "vertical" && thumbsVSwiper && !thumbsVSwiper.destroyed) {
      return thumbsVSwiper;
    }
    return thumbsHSwiper && !thumbsHSwiper.destroyed ? thumbsHSwiper : null;
  }

  /* ── Helper: Update thumb active class ─────────────────── */
  function updateActiveThumbClass(thumbsSwiper, targetIndex) {
    if (!thumbsSwiper || thumbsSwiper.destroyed) return;
    
    // Remove from all
    thumbsSwiper.slides.forEach((slide) => {
      slide.classList.remove('swiper-slide-thumb-active');
    });
    
    // Add to target
    if (thumbsSwiper.slides[targetIndex]) {
      thumbsSwiper.slides[targetIndex].classList.add('swiper-slide-thumb-active');
    }
  }

  /* ── Progress bar ─────── */
  const progressBar = document.getElementById(`${galleryId}-progress-bar`);

  function updateProgress(swiper) {
    if (!progressBar || !swiper || swiper.destroyed) return;

    let totalSlides = swiper.slides.length;
    if (swiper.params.loop) {
      totalSlides = swiper.slides.length - (swiper.loopedSlides * 2 || 2);
    }

    const total = Math.max(totalSlides - 1, 1);
    const progress = swiper.realIndex / total;
    
    // 🔧 SMOOTH: استخدم transition للـ width بدل assign مباشر
    const percentage = Math.min(Math.max(progress, 0), 1) * 100;
    progressBar.style.transition = 'width 0.3s ease-out';
    progressBar.style.width = `${percentage}%`;
    
    console.log(`📊 Progress: ${swiper.realIndex}/${total} = ${percentage.toFixed(1)}%`);
  }

  // 🔧 Also update on transition (smooth mid-animation)
  function updateProgressOnTransition(swiper) {
    if (!progressBar || !swiper || swiper.destroyed) return;

    let totalSlides = swiper.slides.length;
    if (swiper.params.loop) {
      totalSlides = swiper.slides.length - (swiper.loopedSlides * 2 || 2);
    }

    const total = Math.max(totalSlides - 1, 1);
    
    // Calculate progress based on slide progress
    const progress = (swiper.realIndex + swiper.progress) / total;
    const percentage = Math.min(Math.max(progress, 0), 1) * 100;
    
    progressBar.style.width = `${percentage}%`;
  }

  /* ── Main Swiper (CORRECTED) ───────────────────── */
  const swiperContainer = document.getElementById(`${galleryId}-swiper-main`);
  const mainPrevEl = document.getElementById(`${galleryId}-main-prev`);
  const mainNextEl = document.getElementById(`${galleryId}-main-next`);

  console.log('🔍 Main nav elements found:', {
    prev: mainPrevEl ? mainPrevEl.id : 'NOT FOUND',
    next: mainNextEl ? mainNextEl.id : 'NOT FOUND'
  });

  // 🔧 FIX: Build config ONCE, conditionally
  const mainConfig = {
    observer: true,
    observeParents: true,
    loop: loop,
    spaceBetween: 10,
    slidesPerView: 1,
    speed: 400,
    keyboard: keyboard ? {
      enabled: true,
      onlyInViewport: true
    } : false,
    on: {
      init: function () {
        console.log('🎯 Main Swiper initialized');
        updateProgress(this);
        
        // 🔧 CRITICAL: Sync thumbs on init (first slide must be active)
        const activeThumbs = getActiveThumbsSwiper();
        if (activeThumbs && !activeThumbs.destroyed) {
          const targetIndex = this.realIndex;
          
          if (loop) {
            activeThumbs.slideToLoop(targetIndex, 0, false);
          } else {
            activeThumbs.slideTo(targetIndex, 0, false);
          }
          
          // 🔧 Force update active class
          updateActiveThumbClass(activeThumbs, targetIndex);
          
          console.log(`✅ Init sync: First slide (index ${targetIndex}) marked as active`);
        }
      },
      slideChange: function () {
        updateProgress(this);
        const activeThumbs = getActiveThumbsSwiper();
        if (activeThumbs && !activeThumbs.destroyed) {
          // 🔧 SMOOTH: استخدم Swiper's native slideToLoop للـ loop mode
          const targetIndex = this.realIndex;
          
          // Use slideToLoop in loop mode for perfect sync
          if (loop) {
            activeThumbs.slideToLoop(targetIndex, 300, false);
          } else {
            activeThumbs.slideTo(targetIndex, 300, false);
          }
          
          // 🔧 Force update active class (manual backup)
          updateActiveThumbClass(activeThumbs, targetIndex);
          
          console.log(`🎯 Synced: Main index ${targetIndex} → Thumbs (Smooth)`);
        }
      },
      slideChangeTransitionStart: function () {
        // Update progress as user drags
        updateProgressOnTransition(this);
      },
      slideChangeTransitionEnd: function () {
        // Finalize progress
        updateProgress(this);
      },
      touchMove: function () {
        // Update progress in real-time during touch drag
        updateProgressOnTransition(this);
      },
      setTransition: function () {
        // Smooth progress during animation
        if (progressBar) {
          progressBar.style.transition = `width ${this.params.speed}ms ${this.params.speed === 0 ? 'linear' : 'ease-out'}`;
        }
      }
    }
  };

  // 🔧 FIX: Only add navigation if BOTH elements exist
  if (mediaCount > 1 && mainPrevEl && mainNextEl) {
    mainConfig.navigation = {
      prevEl: mainPrevEl,
      nextEl: mainNextEl,
      disabledClass: 'swiper-button-disabled',
      hiddenClass: 'swiper-button-hidden'
    };
    console.log('✅ Navigation configured');
  } else {
    console.warn(`⚠️  Navigation not configured (${mediaCount > 1 ? 'missing elements' : 'single slide'})`);
  }

  // 🔧 FIX: Add autoplay if enabled
  if (autoplay && mediaCount > 1) {
    mainConfig.autoplay = {
      delay: 4000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    };
    console.log('✅ Autoplay enabled');
  }

  // 🔧 FIX: Add thumbs if available
  // ⚠️ IMPORTANT: Remove watchSlidesProgress & watchSlidesVisibility
  // They conflict with manual class updates in loop mode
  const activeThumbs = getActiveThumbsSwiper();
  if (activeThumbs) {
    mainConfig.thumbs = {
      swiper: activeThumbs,
      autoScrollOffset: 1,
      slideThumbActiveClass: 'swiper-slide-thumb-active'
      // DO NOT add watchSlidesProgress or watchSlidesVisibility
    };
    console.log('✅ Thumbs linked (watchSlides disabled for loop compat)');
  }

  let mainSwiper = null;
  try {
    mainSwiper = new Swiper(`#${galleryId}-swiper-main`, mainConfig);
    console.log("✅ Main swiper initialized successfully");

    // 🔧 Manual button binding - CLEAN & SMOOTH
    if (mainPrevEl && mainNextEl) {
      mainPrevEl.onclick = (e) => {
        e.preventDefault();
        if (mainSwiper && !mainSwiper.destroyed) {
          mainSwiper.slidePrev();
          // slideChange event will handle thumbs sync automatically
        }
      };
      
      mainNextEl.onclick = (e) => {
        e.preventDefault();
        if (mainSwiper && !mainSwiper.destroyed) {
          mainSwiper.slideNext();
          // slideChange event will handle thumbs sync automatically
        }
      };
      console.log("✅ Manual button binding enabled");
    }

  } catch (error) {
    console.error("❌ Main swiper error:", error);
    return null;
  }

  /* ── Video events ──────────────────── */
  wrapper.addEventListener("click", (e) => {
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
      return;
    }
  });

  mainSwiper.on("slideChangeTransitionStart", () => {
    stopAllVideos(wrapper);
  });

  /* ── Thumb click delegation ─── */
  function bindThumbClicks(container) {
    if (!container) return;

    container.addEventListener("click", (e) => {
      const slide = e.target.closest(".swiper-slide");
      if (!slide || !mainSwiper || mainSwiper.destroyed) return;

      const slides = Array.from(container.querySelectorAll(".swiper-slide"));
      const idx = slides.indexOf(slide);

      if (idx !== -1) {
        if (loop) {
          mainSwiper.slideToLoop(idx);
        } else {
          mainSwiper.slideTo(idx);
        }
      }
    });

    container.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;

      const slide = e.target.closest(".swiper-slide");
      if (!slide || !mainSwiper || mainSwiper.destroyed) return;

      e.preventDefault();

      const slides = Array.from(container.querySelectorAll(".swiper-slide"));
      const idx = slides.indexOf(slide);

      if (idx !== -1) {
        if (loop) {
          mainSwiper.slideToLoop(idx);
        } else {
          mainSwiper.slideTo(idx);
        }
      }
    });
  }

  bindThumbClicks(thumbsVEl);
  bindThumbClicks(thumbsHEl);

  /* ── Resize handler ───────────────────── */
  let resizeTimer;

  const handleResize = () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      if (!mainSwiper || mainSwiper.destroyed) return;

      const newThumbs = getActiveThumbsSwiper();

      if (newThumbs && mainSwiper.thumbs && mainSwiper.thumbs.swiper !== newThumbs) {
        mainSwiper.thumbs.swiper = newThumbs;
        mainSwiper.thumbs.init();
        mainSwiper.thumbs.update(true);
        
        // 🔧 Re-sync after thumbs swap
        const targetIndex = mainSwiper.realIndex;
        if (loop) {
          newThumbs.slideToLoop(targetIndex, 0, false);
        } else {
          newThumbs.slideTo(targetIndex, 0, false);
        }
        
        // 🔧 Force update active class
        updateActiveThumbClass(newThumbs, targetIndex);
      }

      updateProgress(mainSwiper);
    }, 250);
  };

  window.addEventListener("resize", handleResize);

  // 🔧 FIXED: Return object with proper cleanup
  return {
    main: mainSwiper,
    thumbsV: thumbsVSwiper,
    thumbsH: thumbsHSwiper,
    handleResize,
    destroy() {
      window.removeEventListener("resize", handleResize);
      if (mainSwiper && !mainSwiper.destroyed) mainSwiper.destroy(true, true);
      if (thumbsVSwiper && !thumbsVSwiper.destroyed) thumbsVSwiper.destroy(true, true);
      if (thumbsHSwiper && !thumbsHSwiper.destroyed) thumbsHSwiper.destroy(true, true);
    }
  };
}

/* ============================================================
   Store
   ============================================================ */
window.__pgInstances = window.__pgInstances || {};

/* ============================================================
   Public APIs
   ============================================================ */
export function initProductGallery(galleryId) {
  if (!galleryId) {
    console.error("❌ Gallery ID is required");
    return;
  }

  // Destroy existing instance
  destroyProductGallery(galleryId);

  waitForSwiper(() => {
    const inst = buildSwiperInstances(galleryId);
    if (inst) {
      window.__pgInstances[galleryId] = inst;
      console.log(`✅ Gallery ${galleryId} ready`);
    }
  });
}


export function destroyProductGallery(galleryId) {
  const inst = window.__pgInstances[galleryId];
  if (!inst) return;

  if (inst.destroy) {
    inst.destroy();
  } else {
    if (inst.main && !inst.main.destroyed) inst.main.destroy(true, true);
    if (inst.thumbsV && !inst.thumbsV.destroyed) inst.thumbsV.destroy(true, true);
    if (inst.thumbsH && !inst.thumbsH.destroyed) inst.thumbsH.destroy(true, true);
    if (inst.handleResize) {
      window.removeEventListener("resize", inst.handleResize);
    }
  }

  delete window.__pgInstances[galleryId];
}

export function initAllProductGalleries() {
  const galleries = document.querySelectorAll(".pg-wrapper[data-gallery-id]");
  console.log(`🔍 Found ${galleries.length} galleries`);

  galleries.forEach((el) => {
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

// Auto-init if needed
if (document.readyState === "complete") {
  initAllProductGalleries();
} else {
  window.addEventListener("load", initAllProductGalleries);
}