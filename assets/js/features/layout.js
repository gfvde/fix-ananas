/**
 * Layout Module
 *
 * Handles global layout functionality:
 * - Announcement bar height tracking
 * - Login/logout state management
 * - Customer greeting updates
 * - Locale/region navigation
 */

// ─────────────────────────────────────────────────────────────
// Announcement Bar
// ─────────────────────────────────────────────────────────────

function initAnnouncementBar() {
  const bar = document.querySelector("[data-announcement-bar]");
  if (bar) {
    const updateHeight = () => {
      document.body.style.setProperty("--announcement-bar-h", bar.offsetHeight + "px");
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
  }
}

// ─────────────────────────────────────────────────────────────
// Login/Account Management
// ─────────────────────────────────────────────────────────────

// Both theme.js and cart-controller.js include this module. Share state so the
// layout listeners initialize once and either bundle can complete an auth
// redirect (ported from upstream 3eae6f8 / c3f5c48).
const layoutStateKey = Symbol.for("growth-theme.layout-state");
const layoutState = window[layoutStateKey] || {
  initialized: false,
  pendingAuthRedirect: null,
  authEndpointsComplete: false
};
window[layoutStateKey] = layoutState;

function normalizeAuthRedirect(redirectTo) {
  try {
    const redirectUrl = new URL(redirectTo, window.location.origin);
    if (redirectUrl.origin !== window.location.origin) return "";
    return redirectUrl.pathname + redirectUrl.search + redirectUrl.hash;
  } catch {
    return "";
  }
}

function getProfileRedirect() {
  return normalizeAuthRedirect(window.layoutConfig?.profileUrl || "/account-profile") || "/account-profile";
}

function markCustomerAuthenticated() {
  window.customerAuthState = window.customerAuthState || {};
  window.customerAuthState.isAuthenticated = true;
  window.customerAuthState.isGuest = false;
}

/**
 * Toggle the header/mobile login vs profile buttons (header.jinja ids).
 * Only called with `true` on load so the server-rendered guest state never
 * flickers.
 */
function applyHeaderAuthState(loggedIn) {
  const byId = (id) => document.getElementById(id);
  const loginBtn = byId("header-login-btn");
  const profileBtn = byId("header-profile-btn");
  const mLoginBtn = byId("mobile-login-btn");
  const mProfileBtn = byId("mobile-profile-btn");
  const mLoggedIn = byId("mobile-logged-in-links");

  if (loginBtn) loginBtn.style.display = loggedIn ? "none" : "";
  if (profileBtn) {
    profileBtn.style.display = loggedIn ? "inline-flex" : "none";
    profileBtn.classList.toggle("hidden", !loggedIn);
  }
  if (mLoginBtn) mLoginBtn.style.display = loggedIn ? "none" : "";
  if (mProfileBtn) mProfileBtn.style.display = loggedIn ? "inline-flex" : "none";
  if (mLoggedIn) {
    mLoggedIn.classList.toggle("hidden", !loggedIn);
    mLoggedIn.classList.toggle("flex", loggedIn);
    mLoggedIn.style.display = loggedIn ? "" : "none";
  }
}

/**
 * Single vitrin:auth:success listener (F §5): customerAuthState does not
 * update after a popup login, so set it, refresh the UI, then follow any
 * pending redirect.
 */
function setupAuthSuccessListener() {
  window.addEventListener("vitrin:auth:success", async function () {
    markCustomerAuthenticated();
    applyHeaderAuthState(true);
    initAuthVisibility();

    if (layoutState.pendingAuthRedirect) {
      const redirectUrl = layoutState.pendingAuthRedirect;
      layoutState.pendingAuthRedirect = null;
      window.location.href = redirectUrl;
      return;
    }

    // No redirect: refresh customer data so account-dependent UI updates
    if (window.zid?.account?.get) {
      try {
        const customer = await window.zid.account.get();
        if (customer) {
          window.customer = customer;
          document.dispatchEvent(new CustomEvent("zid-customer-fetched", { detail: { customer } }));
        }
      } catch (err) {
        console.warn("[Layout] Failed to refresh customer after login:", err);
      }
    }
  });
}

/**
 * Login action handler - opens the platform login popup with optional redirect.
 * Exported so the cart bundle reuses the same implementation/state.
 */
export function handleLoginAction(redirectTo, addToUrl) {
  if (redirectTo === undefined || redirectTo === null || typeof redirectTo === "object") redirectTo = "";
  if (addToUrl === undefined) addToUrl = true;

  // Normalize the redirect before checking auth so an explicit action target
  // is preserved for shoppers who are already signed in.
  const finalRedirect = addToUrl ? window.location.pathname + redirectTo : redirectTo;
  const normalizedRedirect = finalRedirect ? normalizeAuthRedirect(finalRedirect) : "";
  const profileRedirect = getProfileRedirect();
  const authRedirect = normalizedRedirect || profileRedirect;

  if (window.customerAuthState && window.customerAuthState.isAuthenticated) {
    window.location.href = redirectTo && normalizedRedirect ? normalizedRedirect : profileRedirect;
    return;
  }

  // Store redirect for post-login navigation (only when the caller asked for one)
  layoutState.pendingAuthRedirect = redirectTo ? authRedirect : null;

  if (typeof window.auth_dialog?.open === "function") {
    window.auth_dialog.open();
  } else {
    // Popup login disabled for this store: go to the login page
    window.location.href = "/auth/login?redirect_to=" + encodeURIComponent(authRedirect);
  }
}

window.handleLoginAction = handleLoginAction;

function initLoginRedirectButtons() {
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-login-redirect]");
    if (btn) {
      e.preventDefault();
      const redirectUrl = btn.dataset.loginRedirect || "";
      window.handleLoginAction(redirectUrl, false);
    }
  });
}

function initCustomerGreeting() {
  document.addEventListener("zid-customer-fetched", function (event) {
    const customer = event.detail?.customer;
    if (customer && (customer.id || customer.name)) {
      markCustomerAuthenticated();
      applyHeaderAuthState(true);
    }

    layoutState.authEndpointsComplete = true;
    initAuthVisibility();
  });

  if (window.customerAuthState?.isAuthenticated) {
    applyHeaderAuthState(true);
  }
}

// ─────────────────────────────────────────────────────────────
// Locale/Region Navigation
// ─────────────────────────────────────────────────────────────

function navigateToLocale(countryCode, languageCode) {
  const config = window.layoutConfig || {};
  const defaultCountryCode = config.defaultCountryCode || "";
  const currentLanguage = config.currentLanguage || "ar";
  const currentCountry = config.currentCountry || "";

  const newLocale =
    languageCode.toLowerCase() +
    (countryCode.toLowerCase() === defaultCountryCode ? "" : "-" + countryCode.toLowerCase());

  const currentLocale = currentLanguage.toLowerCase() + "-" + currentCountry.toLowerCase();
  const pathParts = window.location.pathname.split("/");

  if (
    pathParts.length > 1 &&
    (pathParts[1].toLowerCase() === currentLanguage.toLowerCase() || pathParts[1].toLowerCase() === currentLocale)
  ) {
    pathParts[1] = newLocale;
  } else {
    pathParts.splice(1, 0, newLocale);
  }

  window.location.href = "/locales/" + newLocale + "?redirect_to=" + encodeURI(pathParts.join("/"));
}

function initLocaleForms() {
  document.querySelectorAll("[data-locale-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const countrySelect = form.querySelector('[name="country"]');
      const languageSelect = form.querySelector('[name="language"]');

      const config = window.layoutConfig || {};
      const selectedCountry = countrySelect ? countrySelect.value : config.currentCountry;
      const selectedLanguage = languageSelect ? languageSelect.value : config.currentLanguage;

      navigateToLocale(selectedCountry, selectedLanguage);
    });
  });
}

window.selectMobileCountry = function (countryCode) {
  const config = window.layoutConfig || {};
  navigateToLocale(countryCode, config.currentLanguage);
};

window.selectMobileLanguage = function (languageCode) {
  const config = window.layoutConfig || {};
  navigateToLocale(config.currentCountry, languageCode);
};

// ─────────────────────────────────────────────────────────────
// Auth-Based Visibility (Cache-Safe)
// ─────────────────────────────────────────────────────────────

/**
 * Initialize auth-based element visibility
 * Elements with [data-auth-guest] are shown only to guests
 * Elements with [data-auth-user] are shown only to authenticated users
 * This allows templates to be cached while still showing correct content
 */
export function initAuthVisibility() {
  const isGuest = !window.customerAuthState || window.customerAuthState.isGuest;
  const isAuthenticated = window.customerAuthState && window.customerAuthState.isAuthenticated;

  // Show/hide guest-only elements
  document.querySelectorAll("[data-auth-guest]").forEach((el) => {
    el.classList.toggle("hidden", !isGuest);
  });

  // Show/hide authenticated-only elements
  document.querySelectorAll("[data-auth-user]").forEach((el) => {
    el.classList.toggle("hidden", !isAuthenticated);
  });

  // Update any auth-dependent hrefs
  document.querySelectorAll("[data-auth-href-guest]").forEach((el) => {
    if (isGuest) {
      el.href = el.dataset.authHrefGuest;
    }
  });

  document.querySelectorAll("[data-auth-href-user]").forEach((el) => {
    if (isAuthenticated) {
      el.href = el.dataset.authHrefUser;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

export function init() {
  if (layoutState.initialized) return;
  layoutState.initialized = true;

  initAnnouncementBar();
  initLocaleForms();
  initLoginRedirectButtons();
  initCustomerGreeting();
  setupAuthSuccessListener();
  initAuthVisibility();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
