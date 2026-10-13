/*
 * Mouse drag-to-scroll for every horizontal slider built on a native scroll container
 * (overflow-x: auto + scroll-snap). Touch already swipes natively; with a mouse the
 * browser only scrolls by wheel and drags the image instead. This lets a mouse drag
 * move the track, stops the image ghost-drag, and swallows the click that ends a drag
 * so a card link doesn't open.
 */
(function () {
  if (window.__ananasDragScroll) return;
  window.__ananasDragScroll = true;

  var DRAG_THRESHOLD = 5;
  // Tracks that already handle mouse drag themselves.
  var OWN_DRAG = ".fp-carousel__viewport, .pc-tags-wrapper, [data-no-drag-scroll]";

  function scrollableX(el) {
    while (el && el !== document.body && el.nodeType === 1) {
      if (el.matches(OWN_DRAG)) return null;
      if (el.scrollWidth > el.clientWidth + 1) {
        var ox = window.getComputedStyle(el).overflowX;
        if (ox === "auto" || ox === "scroll") return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  var track = null,
    startX = 0,
    startLeft = 0,
    dragged = false,
    snap = "";

  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    track = scrollableX(e.target);
    if (!track) return;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    dragged = false;
  });

  document.addEventListener("pointermove", function (e) {
    if (!track) return;
    var dx = e.clientX - startX;
    if (!dragged) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      dragged = true;
      // Snapping fights a manual scrollLeft; restore it on release so the track settles.
      snap = track.style.scrollSnapType;
      track.style.scrollSnapType = "none";
      track.style.scrollBehavior = "auto";
      track.classList.add("is-dragging");
      document.body.style.userSelect = "none";
    }
    track.scrollLeft = startLeft - dx;
  });

  function end() {
    if (!track) return;
    var t = track;
    track = null;
    if (!dragged) return;
    // The click (if any) fires right after pointerup; clear the flag after it either way.
    setTimeout(function () {
      dragged = false;
    }, 0);
    document.body.style.userSelect = "";
    t.classList.remove("is-dragging");
    t.style.scrollBehavior = "";
    t.style.scrollSnapType = snap;
  }
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);

  // The click that ends a drag must not follow the card link.
  document.addEventListener(
    "click",
    function (e) {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  // No native image/link ghost-drag inside a scrollable track.
  document.addEventListener("dragstart", function (e) {
    if (scrollableX(e.target)) e.preventDefault();
  });
})();
