const TOAST_ROOT_ID = "ananas-toast-root";
const TOAST_STYLE_ID = "ananas-toast-styles";
const DEFAULT_DURATION = 2600;

function ensureToastStyles() {
  if (document.getElementById(TOAST_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = TOAST_STYLE_ID;
  style.textContent = `
    #${TOAST_ROOT_ID} {
      position: fixed;
      top: 18px;
      inset-inline-end: 18px;
      z-index: 100000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .ananas-toast {
      min-width: min(320px, calc(100vw - 32px));
      max-width: calc(100vw - 32px);
      padding: 12px 14px;
      border: 1px solid #e7e5e4;
      background: #fcfaf7;
      color: #000;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
      font-size: 14px;
      line-height: 22px;
      opacity: 0;
      transform: translateY(-8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: auto;
    }
    .ananas-toast.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .ananas-toast--success {
      border-inline-start: 4px solid #25a562;
    }
    .ananas-toast--error {
      border-inline-start: 4px solid #c70036;
    }
    @media (max-width: 767px) {
      #${TOAST_ROOT_ID} {
        top: 12px;
        inset-inline: 12px;
      }
      .ananas-toast {
        width: 100%;
        min-width: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureToastRoot() {
  ensureToastStyles();

  let root = document.getElementById(TOAST_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = TOAST_ROOT_ID;
    root.setAttribute("aria-live", "polite");
    root.setAttribute("aria-atomic", "true");
    // Follow the document direction (Arabic RTL / English LTR)
    root.dir = document.documentElement.dir || document.body.dir || "auto";
    document.body.appendChild(root);
  }
  return root;
}

function showToast(message, type = "success", duration = DEFAULT_DURATION) {
  if (!message) return;

  const root = ensureToastRoot();
  const toast = document.createElement("div");
  toast.className = `ananas-toast ananas-toast--${type}`;
  toast.textContent = message;
  root.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 220);
  }, duration);
}

window.showAnanasToast = showToast;

window.addEventListener("toast:show", (event) => {
  const { message, type, duration } = event.detail || {};
  showToast(message, type, duration);
});

