/**
 * Swiper (https://swiperjs.com/) — bundled for use in theme JS and exposed on window
 * for sections that need it without a separate Vite entry.
 *
 * Usage in JS modules:
 *   import Swiper from "swiper";
 *   import { Navigation, Pagination } from "swiper/modules";
 *   import "swiper/css";
 *
 * Usage from inline / browser console (after theme.js loads):
 *   new window.Swiper(".swiper", { modules: [window.SwiperModules.Navigation], ... });
 */
import Swiper from "swiper";
import { Autoplay, EffectFade, Keyboard, Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

if (typeof window !== "undefined") {
  window.Swiper = Swiper;
  window.SwiperModules = {
    Autoplay,
    EffectFade,
    Keyboard,
    Navigation,
    Pagination,
  };
}
