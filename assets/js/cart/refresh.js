/**
 * Cart Refresh Module
 *
 * Handles AJAX cart page refresh and loading states.
 * Listens to platform zidcart:* events.
 */

import { updatePaymentWidgets, updateLoyaltyDisplay } from "./totals.js";
import { setupCouponInput } from "./coupon.js";
import { calculateLoyaltyPoints } from "./loyalty.js";

// Module state
let isRefreshing = false;

// Selectors for AJAX refresh
const SELECTORS = {
  cartContainer: ".cart-with-products",
  productsList: "[data-cart-products-list]",
  orderSummary: "[data-cart-totals]",
  checkoutTotal: "[data-cart-summary-checkout-total]",
  couponSection: "[data-coupon-section]",
  giftOrderSection: "[data-gift-order-section]",
  loyaltySection: "[data-loyalty-section]",
  shippingProgress: "[data-free-shipping-bar]",
  paymentWidgets: "[data-payment-widgets]",
  emptyState: ".theme-container"
};

/**
 * Set cart loading state
 * @param {boolean} loading - Whether loading is active
 * @param {string} targetProductId - Optional specific product ID to highlight
 */
export function setCartLoadingState(loading, targetProductId) {
  const productsList = document.querySelector(SELECTORS.productsList);

  if (loading) {
    // Add loading class to products list
    if (productsList) {
      productsList.classList.add("opacity-50");
      productsList.style.pointerEvents = "none";
      productsList.setAttribute("aria-busy", "true");
    }

    // Show spinner on specific product if provided
    if (targetProductId) {
      const productCard = document.querySelector('[data-cart-product-id="' + targetProductId + '"]');
      if (productCard) {
        productCard.classList.add("opacity-50");
      }
    }
  } else {
    // Remove loading state
    if (productsList) {
      productsList.classList.remove("opacity-50");
      productsList.style.pointerEvents = "";
      productsList.setAttribute("aria-busy", "false");
    }
  }
}

/**
 * Swap element content from new document
 * @param {string} selector - CSS selector
 * @param {Document} newDoc - Parsed HTML document
 */
function swapElement(selector, newDoc) {
  const currentEl = document.querySelector(selector);
  const newEl = newDoc.querySelector(selector);

  if (currentEl && newEl) {
    currentEl.innerHTML = newEl.innerHTML;
  }
}

function swapElements(selector, newDoc) {
  const currentElements = document.querySelectorAll(selector);
  const newElements = newDoc.querySelectorAll(selector);

  currentElements.forEach((currentEl, index) => {
    const newEl = newElements[index];
    if (newEl) {
      currentEl.innerHTML = newEl.innerHTML;
    }
  });
}

/**
 * Refresh cart page via AJAX
 * Fetches current page and swaps content sections
 */
export async function refreshCartPage() {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    const response = await fetch(window.location.href, {
      headers: { "X-Requested-With": "XMLHttpRequest" }
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Check if cart is now empty
    const newCartContainer = doc.querySelector(SELECTORS.cartContainer);
    const currentCartContainer = document.querySelector(SELECTORS.cartContainer);

    if (!newCartContainer && currentCartContainer) {
      // Cart is now empty - reload to show empty state
      window.location.reload();
      return;
    }

    // Swap products list
    swapElement(SELECTORS.productsList, doc);

    // Swap order summaries (mobile and desktop)
    swapElements(SELECTORS.orderSummary, doc);

    // Swap checkout button totals (mobile and desktop)
    swapElements(SELECTORS.checkoutTotal, doc);

    // Swap coupon sections (mobile and desktop)
    swapElements(SELECTORS.couponSection, doc);

    // Swap gift order sections (mobile and desktop)
    swapElements(SELECTORS.giftOrderSection, doc);

    // Swap loyalty section
    swapElement(SELECTORS.loyaltySection, doc);

    // Swap shipping progress bars (desktop and mobile)
    swapElements(SELECTORS.shippingProgress, doc);

    // Swap payment widgets
    swapElement(SELECTORS.paymentWidgets, doc);

    // Re-initialize quantity inputs
    if (window.initQtyInputs) {
      window.initQtyInputs();
    }

    // Re-initialize coupon input handler
    setupCouponInput();

    // Update cart badge in header
    if (window.cartManager && window.cartManager.refreshBadge) {
      window.cartManager.refreshBadge();
    }

    // Update payment widgets (Tamara, Tabby) and loyalty calculations
    updatePaymentWidgets();
    updateLoyaltyDisplay();
    await updateCartLoyaltyPoints();

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent("cart-updated"));
  } catch (error) {
    console.error("Error refreshing cart:", error);
    // Fallback to page reload on error
    window.location.reload();
  } finally {
    isRefreshing = false;
    setCartLoadingState(false);
  }
}

async function updateCartLoyaltyPoints() {
  const cartObj = await getLatestCartObject();
  const totalAmount = cartObj?.totals?.find((total) => total.code === "total");
  const totalValue = Number(totalAmount?.value || cartObj?.total_value || 0);

  if (totalValue > 0) {
    calculateLoyaltyPoints(totalValue);
  }
}

async function getLatestCartObject() {
  if (window.zid?.cart?.get) {
    try {
      const cartData = await window.zid.cart.get();
      if (cartData) {
        window.cartObj = cartData;
        window.cartObject = cartData;
        return cartData;
      }
    } catch (error) {
      console.error("Error getting latest cart for loyalty:", error);
    }
  }

  return window.cartObj || window.cartObject;
}

/**
 * Setup ZidCart event listeners
 * Listens to platform events: zidcart:loading, zidcart:updated, zidcart:error
 */
export function setupZidCartEventListeners() {
  // Loading state - show spinner/overlay
  window.addEventListener("zidcart:loading", (e) => {
    const detail = e.detail || {};
    setCartLoadingState(true, detail.cartProductId);
  });

  // Cart updated - refresh the page content via AJAX
  window.addEventListener("zidcart:updated", () => {
    refreshCartPage();
  });

  // Error state - hide loading and show error
  window.addEventListener("zidcart:error", (e) => {
    const detail = e.detail || {};
    console.error("Cart error:", detail.error);
    setCartLoadingState(false);
  });
}

/**
 * Check if currently refreshing
 * @returns {boolean}
 */
export function isCartRefreshing() {
  return isRefreshing;
}
