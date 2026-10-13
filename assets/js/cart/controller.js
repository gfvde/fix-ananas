/**
 * Cart Controller Module
 *
 * Main orchestrator for cart page functionality.
 * Imports and coordinates all cart sub-modules.
 *
 * Platform Callbacks (MUST KEEP):
 * - window.CartPage - Public API
 * - window.cartProductsHtmlChanged - Platform callback
 * - window.toggleBundleItems - Platform callback
 * - window.refreshCartPage - Global alias
 */

import { setupCouponInput, applyCoupon, removeCoupon } from "./coupon.js";
import {
  initLoyaltyProgram,
  calculateLoyaltyPoints,
  applyLoyaltyRedemption,
  removeLoyaltyRedemption
} from "./loyalty.js";
import {
  handleGiftCardClick,
  editGiftCard,
  deleteGiftCard,
  updateGiftCardDisplay,
  setupGiftEventListener
} from "./gift.js";
import { updateCartTotals, updateFreeShippingProgress } from "./totals.js";
import { setupQuantityInputHandlers, updateQuantity } from "./quantity.js";
import { refreshCartPage, setCartLoadingState, setupZidCartEventListeners } from "./refresh.js";
import { swapCartVariant } from "./variant-swap.js";
import { handleLoginAction } from "../features/layout.js";

// ===== State =====
const state = {
  cart: null,
  isInitialized: false
};

// ===== Configuration (set from template) =====
let config = {
  loyaltyEnabled: false,
  cartTotalValue: 0,
  storeCurrencyCode: "",
  cartCurrencyCode: "",
  translations: {
    forPointsGetDiscount: "For %(points)s points get %(discount)s discount",
    itemsCount: "%(count)s items",
    freeShippingApplied: "Free shipping applied!",
    addMoreForFreeShipping: "Add %(total)s more to get free shipping",
    discount: "Discount",
    loyalty: "Loyalty",
    options: "Options",
    discountTemplate: "%(percent)s discount"
  }
};

// ===== Initialization =====

/**
 * Initialize cart controller
 * @param {Object} options - Configuration options
 */
function init(options) {
  if (state.isInitialized) return;

  // Merge configuration
  if (options) {
    Object.assign(config, options);
    if (options.cart) {
      state.cart = options.cart;
    }
    if (options.translations) {
      Object.assign(config.translations, options.translations);
    }
  }

  // Setup event delegation
  setupEventDelegation();

  // Setup coupon input handler
  setupCouponInput();

  // Setup quantity input handlers for cart
  setupQuantityInputHandlers(
    (cartProductId, productId, quantity) => {
      // Custom handler that uses refreshCartPage
      import("./quantity.js").then(({ handleCartQuantityChange }) => {
        handleCartQuantityChange(cartProductId, productId, quantity, (cart) => refreshAndHydrateCart(cart));
      });
    },
    (cartProductId, productId) => {
      // Custom handler that uses refreshCartPage
      import("./quantity.js").then(({ handleCartProductRemove }) => {
        handleCartProductRemove(cartProductId, productId, () => refreshAndHydrateCart());
      });
    }
  );

  // Setup ZidCart event listeners for AJAX refresh
  setupZidCartEventListeners();

  // Setup gift card event listener
  setupGiftEventListener();

  // Initialize loyalty program if enabled
  if (config.loyaltyEnabled) {
    initLoyaltyProgram(config);
  }

  // Expose global cart object for backward compatibility
  window.cartObject = state.cart;
  window.cartObj = state.cart;
  hydrateCartProductCards(state.cart);
  hydrateCartProductCardsFromApi();
  updateFreeShippingProgress(state.cart, config);

  state.isInitialized = true;
}

// ===== Event Delegation =====

function setupEventDelegation() {
  // Form submit handling
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-coupon-form]");
    if (form) {
      e.preventDefault();
      applyCoupon(refreshCartPage, form);
    }
  });

  // Click handling
  document.addEventListener("click", (e) => {
    const customRemoveBtn = e.target.closest("[data-cart-item-remove]");
    if (customRemoveBtn) {
      e.preventDefault();
      handleCartItemRemove(customRemoveBtn);
      return;
    }

    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;

    switch (action) {
      case "quantity":
        e.preventDefault();
        handleQuantityAction(btn);
        break;

      case "bundle-toggle":
        e.preventDefault();
        toggleBundleItems(btn.dataset.bundleId);
        break;

      case "custom-fields-toggle":
        e.preventDefault();
        toggleCustomFields(btn.dataset.customFieldsId);
        break;

      case "coupon-apply":
        e.preventDefault();
        applyCoupon(refreshCartPage, btn);
        break;

      case "coupon-remove":
        e.preventDefault();
        removeCoupon(refreshCartPage, btn);
        break;

      case "gift-edit":
        e.preventDefault();
        editGiftCard();
        break;

      case "gift-delete":
        e.preventDefault();
        deleteGiftCard();
        break;

      case "gift-open":
        e.preventDefault();
        handleGiftCardClick();
        break;

      case "loyalty-apply":
        e.preventDefault();
        applyLoyaltyRedemption(refreshCartPage);
        break;

      case "loyalty-remove":
        e.preventDefault();
        removeLoyaltyRedemption(refreshCartPage);
        break;

      case "login":
        e.preventDefault();
        handleLoginAction(btn.dataset.redirect || "", btn.dataset.addToUrl !== "false");
        break;

      case "product-remove":
        // Call platform's cartProductRemove function
        if (typeof window.cartProductRemove === "function") {
          window.cartProductRemove(btn);
        }
        break;
    }
  });

  document.addEventListener("change", (e) => {
    const attrSelect = e.target.closest("[data-cart-variant-attr-select]");
    if (attrSelect) {
      handleCartVariantAttributeChange(
        attrSelect.closest("[data-cart-variant-picker]"),
        attrSelect.dataset.cartVariantAttrSelect,
        attrSelect.value
      );
      return;
    }
    const select = e.target.closest("[data-cart-variant-select]");
    if (!select) return;
    handleCartVariantChange(select);
  });

  document.addEventListener("click", (e) => {
    const swatch = e.target.closest("[data-cart-variant-attr]");
    if (!swatch || swatch.classList.contains("is-active")) return;
    e.preventDefault();
    handleCartVariantAttributeChange(swatch.closest("[data-cart-variant-picker]"), swatch.dataset.cartVariantAttr, swatch.dataset.value);
  });
}

function handleCartItemRemove(btn) {
  const cartProductId = btn.dataset.cartId;
  const productId = btn.dataset.productId;
  if (!cartProductId) return;

  setCartLoadingState(true, cartProductId);
  import("./quantity.js").then(({ handleCartProductRemove }) => {
    handleCartProductRemove(cartProductId, productId, () => refreshAndHydrateCart());
  });
}

/**
 * Handle quantity button action
 * @param {HTMLElement} btn - Button element
 */
async function handleQuantityAction(btn) {
  const cartProductId = btn.dataset.cartId;
  const productId = btn.dataset.productId;
  const delta = parseInt(btn.dataset.delta, 10);

  setCartLoadingState(true, cartProductId);
  await updateQuantity(cartProductId, productId, delta, () => refreshAndHydrateCart());
  setCartLoadingState(false);
}

function refreshAndHydrateCart(cartOverride) {
  productHydrationAttempts = 0;
  if (cartOverride?.totals) {
    state.cart = cartOverride;
    window.cartObject = cartOverride;
    window.cartObj = cartOverride;
    updateCartTotals(cartOverride, config);
    updateFreeShippingProgress(cartOverride, config);
    updateLoyaltyPoints(cartOverride);
  }

  return refreshCartPage().then(() => {
    hydrateCartProductCards(state.cart || window.cartObject);
    return hydrateCartProductCardsFromApi();
  });
}

function updateLoyaltyPoints(cart) {
  if (!config.loyaltyEnabled) return;

  const totalAmount = cart?.totals?.find((total) => total.code === "total");
  const totalValue = Number(totalAmount?.value || cart?.total_value || 0);

  if (totalValue > 0) {
    config.cartTotalValue = totalValue;
    calculateLoyaltyPoints(totalValue);
  }
}

function resolveImageUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;

  return (
    value.url ||
    value.full_size ||
    value.medium ||
    value.thumbnail ||
    value.small ||
    value.image_url ||
    value.src ||
    value.path ||
    value.image?.url ||
    value.image?.full_size ||
    value.image?.medium ||
    value.image?.thumbnail ||
    value.image?.small ||
    value.image?.original ||
    value.image?.src ||
    value.image?.path ||
    value.data?.url ||
    value.data?.full_size ||
    value.data?.medium ||
    value.data?.thumbnail ||
    value.data?.image_url ||
    ""
  );
}

function getCartItemImage(item) {
  return (
    resolveImageUrl(item?.image_url) ||
    resolveImageUrl(item?.image) ||
    resolveImageUrl(item?.images?.[0]) ||
    resolveImageUrl(item?.product?.image) ||
    resolveImageUrl(item?.product?.image_url) ||
    resolveImageUrl(item?.product?.main_image) ||
    resolveImageUrl(item?.product?.images?.[0]) ||
    resolveImageUrl(item?.product?.thumbnail) ||
    resolveImageUrl(item?.thumbnail) ||
    resolveImageUrl(item?.product?.media?.[0]) ||
    resolveImageUrl(item?.product?.selected_product?.media?.[0]) ||
    resolveImageUrl(item?.product?.selected_product?.images?.[0]) ||
    resolveImageUrl(item?.selected_product?.media?.[0]) ||
    resolveImageUrl(item?.selected_product?.images?.[0]) ||
    resolveImageUrl(item?.variant?.media?.[0]) ||
    resolveImageUrl(item?.variant?.images?.[0]) ||
    resolveImageUrl(item?.data?.image) ||
    resolveImageUrl(item?.data?.images?.[0])
  );
}

const productImageCache = new Map();
const productDetailsCache = new Map();
let pendingProductHydrationTimer = null;
let productHydrationAttempts = 0;

function normalizeProductResponse(response) {
  return response?.product || response?.data?.product || response?.data || response;
}

function getCartItemIdCandidates(item) {
  return [
    item?.product?.selected_product?.id,
    item?.selected_product?.id,
    item?.variant?.id,
    item?.selected_product_id,
    item?.variant_id,
    item?.product_id,
    item?.product?.id,
    item?.parent_id,
    item?.id
  ]
    .map(normalizeId)
    .filter(Boolean);
}

function getProductFetchCandidates(item) {
  return [
    item?.product?.id,
    item?.parent_id,
    item?.product?.parent_id,
    item?.product?.selected_product?.product_id,
    item?.selected_product?.product_id,
    item?.product_id,
    item?.product?.selected_product?.id,
    item?.selected_product?.id,
    item?.variant?.id,
    item?.selected_product_id,
    item?.variant_id,
    item?.id
  ]
    .map(normalizeId)
    .filter(Boolean);
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  return [];
}

function getVariantList(product) {
  return [
    product?.selected_product,
    product?.variant,
    product?.selected_variant,
    ...asArray(product?.variants),
    ...asArray(product?.products),
    ...asArray(product?.selected_products),
    ...asArray(product?.options?.variants)
  ].filter(Boolean);
}

function matchProductVariant(item, product) {
  const itemIds = new Set(getCartItemIdCandidates(item));
  const itemSku = normalizeId(item?.sku || item?.product?.selected_product?.sku || item?.selected_product?.sku);

  return getVariantList(product).find((variant) => {
    const variantIds = [variant?.id, variant?.product_id, variant?.selected_product_id, variant?.variant_id]
      .map(normalizeId)
      .filter(Boolean);
    if (variantIds.some((id) => itemIds.has(id))) return true;
    return itemSku && normalizeId(variant?.sku) === itemSku;
  });
}

function getProductDetailImage(product, variant) {
  return (
    resolveImageUrl(product?.images?.[0]) ||
    resolveImageUrl(product?.image) ||
    resolveImageUrl(product?.image_url) ||
    resolveImageUrl(product?.main_image) ||
    resolveImageUrl(product?.media?.[0]) ||
    resolveImageUrl(product?.thumbnail) ||
    resolveImageUrl(product?.selected_product?.media?.[0]) ||
    resolveImageUrl(product?.selected_product?.images?.[0]) ||
    resolveImageUrl(product?.selected_product?.image) ||
    resolveImageUrl(variant?.media?.[0]) ||
    resolveImageUrl(variant?.images?.[0]) ||
    resolveImageUrl(variant?.image) ||
    resolveImageUrl(variant?.image_url) ||
    resolveImageUrl(variant?.main_image) ||
    ""
  );
}

async function fetchProductDetails(productId) {
  if (!productId || !window.zid?.products?.get) return "";
  const key = normalizeId(productId);
  if (productDetailsCache.has(key)) return productDetailsCache.get(key);

  try {
    const response = await window.zid.products.get(productId);
    const product = normalizeProductResponse(response);
    productDetailsCache.set(key, product || null);
    return product || null;
  } catch (error) {
    productDetailsCache.set(key, null);
    return null;
  }
}

async function fetchProductDetailsForItem(item) {
  const candidates = [...new Set(getProductFetchCandidates(item))];
  let fallbackProduct = null;

  for (const candidate of candidates) {
    const product = await fetchProductDetails(candidate);
    if (!product) continue;
    if (getVariantList(product).length > 1) return product;
    if (!fallbackProduct && getProductDetailImage(product)) fallbackProduct = product;
  }

  return fallbackProduct;
}

async function fetchProductImage(productId, item) {
  const key = `${normalizeId(productId)}:${getCartItemIdCandidates(item || {}).join("|")}`;
  if (productImageCache.has(key)) return productImageCache.get(key);

  const product = item ? await fetchProductDetailsForItem(item) : await fetchProductDetails(productId);
  const variant = item ? matchProductVariant(item, product) : null;
  const image = getProductDetailImage(product, variant);
  productImageCache.set(key, image);
  return image;
}

function mergeCartItemProductDetails(item, product) {
  if (!product) return item;
  const variant = matchProductVariant(item, product);
  const selectedProduct = variant || product.selected_product || item?.product?.selected_product;
  return {
    ...item,
    product: {
      ...(item.product || {}),
      ...product,
      selected_product: selectedProduct
    },
    image_url: getProductDetailImage(product, variant) || item.image_url
  };
}

function normalizeId(value) {
  return value === undefined || value === null ? "" : String(value);
}

function findCartItemForCard(card, products) {
  const cartId = normalizeId(card.dataset.cartProductId);
  const productId = normalizeId(card.dataset.cartItemProductId);

  return products.find((item) => {
    const candidates = [
      item?.id,
      item?.product_id,
      item?.product?.id,
      item?.product?.selected_product?.id,
      item?.selected_product_id,
      item?.variant_id
    ].map(normalizeId);

    return candidates.includes(cartId) || candidates.includes(productId);
  });
}

function asOptionArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  if (typeof value === "object") {
    return Object.entries(value).map(([name, optionValue]) => ({ name, value: optionValue }));
  }
  return [];
}

function pickOptionLabel(option) {
  return (
    option?.name ||
    option?.title ||
    option?.label ||
    option?.option?.name ||
    option?.option?.title ||
    option?.attribute?.name ||
    option?.attribute?.title ||
    option?.attribute_name ||
    option?.property_name ||
    ""
  );
}

function pickOptionValue(option) {
  const value = option?.value ?? option?.selected_value ?? option?.option_value ?? option?.value_name ?? option?.label;
  if (value && typeof value === "object") {
    return value.name || value.title || value.label || value.value || value.display_value || "";
  }
  return value || "";
}

function getCartItemOptions(item) {
  const sources = [
    item?.options,
    item?.product_options,
    item?.selected_options,
    item?.variant_options,
    item?.attributes,
    item?.selected_product?.attributes,
    item?.selected_product?.options,
    item?.variant?.attributes,
    item?.variant?.options,
    item?.product?.selected_options,
    item?.product?.selected_product?.options,
    item?.product?.selected_product?.option_values,
    item?.product?.selected_product?.attributes,
    item?.product?.variant?.attributes,
    item?.product?.attributes
  ];

  const options = [];
  sources.forEach((source) => {
    asOptionArray(source).forEach((option) => {
      const label = String(pickOptionLabel(option) || "").trim();
      const value = String(pickOptionValue(option) || "").trim();
      if (!value) return;
      const key = `${label}:${value}`;
      if (!options.some((existing) => existing.key === key)) {
        options.push({ key, label, value });
      }
    });
  });

  return options;
}

function getVariantId(variant) {
  return normalizeId(variant?.id || variant?.product_id || variant?.selected_product_id || variant?.variant_id);
}

function getVariantLabel(variant) {
  const attributes = asOptionArray(variant?.attributes || variant?.options || variant?.option_values)
    .map((option) => pickOptionValue(option))
    .filter(Boolean);
  return attributes.length ? attributes.join(" - ") : variant?.name || variant?.title || getVariantId(variant);
}

function getCartItemGroupKey(item) {
  return normalizeId(item?.product?.html_url || item?.product?.url || item?.url || item?.product?.id || "");
}

function cartItemToVariant(item) {
  return {
    id: item?.product_id || item?.product?.selected_product?.id || item?.selected_product_id || item?.variant_id || item?.id,
    name: item?.product?.name || item?.name || "",
    attributes: getCartItemOptions(item).map((option) => ({ name: option.label, value: option.value }))
  };
}

function getSiblingCartVariants(item, products) {
  const groupKey = getCartItemGroupKey(item);
  if (!groupKey) return [];

  return products
    .filter((candidate) => candidate !== item && getCartItemGroupKey(candidate) === groupKey)
    .map(cartItemToVariant);
}

function renderVariantSelector(item, products = []) {
  const variants = [...getVariantList(item?.product), ...getSiblingCartVariants(item, products)];
  const uniqueVariants = [];
  const seen = new Set();

  variants.forEach((variant) => {
    const id = getVariantId(variant);
    if (!id || seen.has(id)) return;
    seen.add(id);
    uniqueVariants.push(variant);
  });

  if (uniqueVariants.length < 2) return "";

  const selectedVariant = matchProductVariant(item, item.product);
  const selectedId = getVariantId(selectedVariant) || normalizeId(item?.product_id || item?.selected_product_id || item?.variant_id);

  // Dara: one control per attribute (color swatches + selects) when every variant names its attributes
  const attributePicker = renderVariantAttributePicker(item, uniqueVariants, selectedVariant, selectedId);
  if (attributePicker) return attributePicker;

  return `<div class="ananas-cart-item__option ananas-cart-item__option--variant">
    <select class="ananas-cart-item__variant-select" data-cart-variant-select data-current-variant-id="${escapeHtml(selectedId)}">
      ${uniqueVariants
        .map((variant) => {
          const id = getVariantId(variant);
          const label = escapeHtml(getVariantLabel(variant));
          return `<option value="${escapeHtml(id)}"${id === selectedId ? " selected" : ""}>${label}</option>`;
        })
        .join("")}
    </select>
    <span class="ananas-cart-item__option-label">:${escapeHtml(config.translations.options || "Options")}</span>
  </div>`;
}

function getVariantAttributes(variant) {
  return asOptionArray(variant?.attributes || variant?.options || variant?.option_values)
    .map((option) => ({
      name: String(pickOptionLabel(option) || "").trim(),
      value: String(pickOptionValue(option) || "").trim()
    }))
    .filter((attr) => attr.name && attr.value);
}

function isColorAttribute(name) {
  const normalized = String(name || "").toLowerCase();
  return normalized.includes("color") || normalized.includes("colour") || normalized.includes("لون");
}

function renderVariantAttributePicker(item, variants, selectedVariant, selectedId) {
  const variantAttrs = variants.map((variant) => ({ id: getVariantId(variant), attrs: getVariantAttributes(variant) }));
  if (variantAttrs.some((entry) => !entry.attrs.length)) return "";

  // attribute name -> ordered unique values
  const groups = new Map();
  variantAttrs.forEach(({ attrs }) => {
    attrs.forEach(({ name, value }) => {
      if (!groups.has(name)) groups.set(name, []);
      const values = groups.get(name);
      if (!values.includes(value)) values.push(value);
    });
  });
  if (!groups.size) return "";

  const selectedAttrs = selectedVariant
    ? getVariantAttributes(selectedVariant)
    : getCartItemOptions(item).map((option) => ({ name: option.label, value: option.value }));
  const selectedValue = (name) => selectedAttrs.find((attr) => attr.name === name)?.value || "";

  const hiddenSelect = `<select class="hidden" hidden aria-hidden="true" tabindex="-1" data-cart-variant-select data-current-variant-id="${escapeHtml(selectedId)}">
      ${variantAttrs
        .map(
          ({ id, attrs }) =>
            `<option value="${escapeHtml(id)}" data-attrs="${escapeHtml(JSON.stringify(attrs))}"${id === selectedId ? " selected" : ""}></option>`
        )
        .join("")}
    </select>`;

  // Non-color groups first: the item row is laid out so the last group sits at the start edge (Figma: color first)
  const names = [...groups.keys()].sort((a, b) => Number(isColorAttribute(a)) - Number(isColorAttribute(b)));

  const groupsMarkup = names
    .map((name) => {
      const values = groups.get(name);
      const current = selectedValue(name);
      const label = `<span class="ananas-cart-item__option-label">${escapeHtml(name)}:</span>`;
      if (isColorAttribute(name)) {
        const swatches = values
          .map(
            (value, index) => `<button type="button" class="ananas-cart-item__swatch-item${value === current ? " is-active" : ""}" data-cart-variant-attr="${escapeHtml(name)}" data-value="${escapeHtml(value)}" aria-pressed="${value === current ? "true" : "false"}" aria-label="${escapeHtml(name)}: ${escapeHtml(value)}">
              <span class="ananas-cart-item__swatch" style="background-color: ${escapeHtml(colorFromOption(value, index))}"></span>
              <span class="ananas-cart-item__option-value">${escapeHtml(value)}</span>
            </button>`
          )
          .join("");
        return `<div class="ananas-cart-item__option ananas-cart-item__option--color"><div class="ananas-cart-item__swatch-wrap">${swatches}</div>${label}</div>`;
      }
      const options = values
        .map((value) => `<option value="${escapeHtml(value)}"${value === current ? " selected" : ""}>${escapeHtml(value)}</option>`)
        .join("");
      return `<div class="ananas-cart-item__option ananas-cart-item__option--attr"><select class="ananas-cart-item__variant-select" data-cart-variant-attr-select="${escapeHtml(name)}" aria-label="${escapeHtml(name)}">${options}</select>${label}</div>`;
    })
    .join("");

  return `<div class="ananas-cart-item__variant-picker" data-cart-variant-picker>${hiddenSelect}${groupsMarkup}</div>`;
}

/**
 * Resolve the variant for an attribute change (swatch click or attribute select) and hand it
 * to the existing swap flow through the picker's hidden variant select.
 */
function handleCartVariantAttributeChange(picker, changedName, changedValue) {
  const select = picker?.querySelector("[data-cart-variant-select]");
  if (!select || select.disabled) return;

  const wanted = {};
  picker.querySelectorAll("[data-cart-variant-attr].is-active").forEach((btn) => {
    wanted[btn.dataset.cartVariantAttr] = btn.dataset.value;
  });
  picker.querySelectorAll("[data-cart-variant-attr-select]").forEach((attrSelect) => {
    wanted[attrSelect.dataset.cartVariantAttrSelect] = attrSelect.value;
  });
  wanted[changedName] = changedValue;

  let best = null;
  let bestScore = -1;
  Array.from(select.options).forEach((option) => {
    let attrs = [];
    try {
      attrs = JSON.parse(option.dataset.attrs || "[]");
    } catch {
      attrs = [];
    }
    if (!attrs.some((attr) => attr.name === changedName && attr.value === changedValue)) return;
    const score = attrs.filter((attr) => wanted[attr.name] === attr.value).length;
    if (score > bestScore) {
      best = option;
      bestScore = score;
    }
  });

  if (!best || best.value === select.dataset.currentVariantId || !window.zid?.cart) return;
  select.value = best.value;
  picker.classList.add("is-loading");
  picker.querySelectorAll("button, [data-cart-variant-attr-select]").forEach((control) => {
    control.disabled = true;
  });
  handleCartVariantChange(select);
}

function normalizeNumber(value) {
  if (value && typeof value === "object") {
    value = value.amount ?? value.value ?? value.formatted ?? value.string ?? 0;
  }
  if (typeof value === "number") return value;
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  return parseFloat(cleaned) || 0;
}

function formatPriceText(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") {
    const currency = config.cartCurrencyCode || config.storeCurrencyCode || "";
    const amount = value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency ? `${amount} ${currency}` : amount;
  }
  return String(value);
}

function getCartItemMeta(item) {
  const category = item?.product?.categories?.[0] || item?.product?.category || item?.category || item?.product?.type;
  if (typeof category === "string") return category;
  return category?.name || category?.title || category?.label || "";
}

function getCartItemPriceText(item) {
  return (
    item?.price_formatted ||
    item?.price_string ||
    item?.product?.selected_product?.formatted_sale_price ||
    item?.product?.formatted_sale_price ||
    item?.total_string ||
    item?.total_formatted ||
    formatPriceText(item?.price || item?.product?.selected_product?.sale_price || item?.product?.sale_price)
  );
}

function getCartItemCompareText(item) {
  return (
    item?.compare_at_price_formatted ||
    item?.compare_at_price_string ||
    (item?.product?.selected_product?.formatted_sale_price ? item?.product?.selected_product?.formatted_price : "") ||
    (item?.product?.formatted_sale_price ? item?.product?.formatted_price : "") ||
    formatPriceText(item?.compare_at_price)
  );
}

function getCartItemDiscountPercent(item) {
  const direct =
    item?.discount_percentage ||
    item?.discount_percent ||
    item?.product?.selected_product?.discount_percentage ||
    item?.product?.discount_percentage;
  if (direct) return direct;

  const price = normalizeNumber(item?.price || item?.product?.selected_product?.sale_price || item?.product?.sale_price);
  const compare = normalizeNumber(item?.compare_at_price || item?.product?.selected_product?.price || item?.product?.price);
  if (!price || !compare || compare <= price) return "";
  return Math.round(((compare - price) / compare) * 100);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function colorFromOption(value, index) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("#")) return value;
  if (normalized.includes("black") || normalized.includes("اسود") || normalized.includes("أسود")) return "#3c3528";
  if (
    normalized.includes("gray") ||
    normalized.includes("grey") ||
    normalized.includes("رمادي") ||
    normalized.includes("رصاص")
  ) {
    return "#9d9d9d";
  }
  if (normalized.includes("beige") || normalized.includes("بيج")) return "#a89e86";
  if (normalized.includes("green") || normalized.includes("اخضر") || normalized.includes("أخضر")) return "#0d7a44";
  if (normalized.includes("red") || normalized.includes("احمر") || normalized.includes("أحمر")) return "#c70036";
  return ["#a89e86", "#3c3528", "#9d9d9d", "#0d7a44"][index % 4];
}

function renderCartOption(option, index) {
  const label = escapeHtml(option.label);
  const value = escapeHtml(option.value);
  const normalizedLabel = String(option.label || "").toLowerCase();
  const isColor = normalizedLabel.includes("color") || normalizedLabel.includes("لون");
  const isSize = normalizedLabel.includes("size") || normalizedLabel.includes("مقاس");

  let valueMarkup = `<span class="ananas-cart-item__option-value">${value}</span>`;
  if (isSize) {
    valueMarkup = `<span class="ananas-cart-item__select-value">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${value}
    </span>`;
  } else if (isColor) {
    valueMarkup = `<div class="ananas-cart-item__swatch-wrap">
      <span class="ananas-cart-item__swatch-item">
        <span class="ananas-cart-item__swatch" style="background-color: ${escapeHtml(colorFromOption(option.value, index))}"></span>
        <span class="ananas-cart-item__option-value">${value}</span>
      </span>
    </div>`;
  }

  return `<div class="ananas-cart-item__option">
    ${valueMarkup}
    ${label ? `<span class="ananas-cart-item__option-label">${label}:</span>` : ""}
  </div>`;
}

function hydrateCartProductCards(cart) {
  const products = cart?.products || [];
  if (!products.length) return;

  document.querySelectorAll(".ananas-cart-item").forEach((card) => {
    const item = findCartItemForCard(card, products);
    if (!item) return;

    const imageUrl = getCartItemImage(item);
    const imageWrap = card.querySelector("[data-cart-item-image-wrap]");
    if (imageUrl && imageWrap && !imageWrap.querySelector("[data-cart-item-image]")) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = item.product?.name || item.name || "";
      img.loading = "lazy";
      img.className = "ananas-cart-item__image";
      img.setAttribute("data-cart-item-image", "");
      imageWrap.appendChild(img);
    }

    const meta = getCartItemMeta(item);
    const metaEl = card.querySelector("[data-cart-item-meta]");
    if (meta && metaEl) {
      metaEl.textContent = meta;
      metaEl.classList.remove("hidden");
    }

    const priceEl = card.querySelector("[data-cart-item-price]");
    const compareEl = card.querySelector("[data-cart-item-compare]");
    const discountEl = card.querySelector("[data-cart-item-discount]");
    const priceRow = card.querySelector(".ananas-cart-item__price-row");
    const priceText = getCartItemPriceText(item);
    const compareText = getCartItemCompareText(item);
    const discountPercent = getCartItemDiscountPercent(item);

    if (priceEl && priceText) {
      priceEl.textContent = priceText;
      priceEl.classList.toggle("is-sale", Boolean(compareText));
    }

    if (priceRow && compareText && !compareEl) {
      const compareNode = document.createElement("span");
      compareNode.className = "ananas-cart-item__compare";
      compareNode.setAttribute("data-cart-item-compare", "");
      compareNode.textContent = compareText;
      priceRow.insertBefore(compareNode, priceEl || null);
    } else if (compareEl && compareText) {
      compareEl.textContent = compareText;
    }

    if (priceRow && discountPercent && !discountEl) {
      const discountNode = document.createElement("span");
      discountNode.className = "ananas-cart-item__discount";
      discountNode.setAttribute("data-cart-item-discount", "");
      discountNode.textContent = (config.translations.discountTemplate || "%(percent)s discount").replace("%(percent)s", `${discountPercent}%`);
      priceRow.insertBefore(discountNode, priceRow.firstChild);
    } else if (discountEl && discountPercent) {
      discountEl.textContent = (config.translations.discountTemplate || "%(percent)s discount").replace("%(percent)s", `${discountPercent}%`);
    }

    const optionsWrap = card.querySelector("[data-cart-item-options]");
    if (optionsWrap) {
      const variantSelector = renderVariantSelector(item, products);
      if (variantSelector) {
        optionsWrap.innerHTML = variantSelector;
        optionsWrap.classList.remove("hidden");
        return;
      }
    }

    if (optionsWrap && !optionsWrap.children.length) {
      const options = getCartItemOptions(item);
      if (options.length) {
        optionsWrap.innerHTML = options.map((option, index) => renderCartOption(option, index)).join("");
        optionsWrap.classList.remove("hidden");
      }
    }
  });
}

async function handleCartVariantChange(select) {
  const card = select.closest(".ananas-cart-item");
  const nextVariantId = select.value;
  const currentVariantId = select.dataset.currentVariantId || "";
  const cartProductId = card?.dataset.cartProductId;
  const qtyInput = card?.querySelector("[data-qty-value], .qty-input-field");
  const quantity = Math.max(1, Number(qtyInput?.value || qtyInput?.textContent || 1));

  if (!nextVariantId || nextVariantId === currentVariantId || !cartProductId || !window.zid?.cart) return;

  select.disabled = true;
  setCartLoadingState(true, cartProductId);

  try {
    // Old line is removed only after the add succeeded; a failed remove rolls the add back
    await swapCartVariant({ lineId: cartProductId, variantId: nextVariantId, quantity });
    await refreshAndHydrateCart();
  } catch (error) {
    console.error("Error changing cart variant:", error);
    select.value = currentVariantId;
    select.disabled = false;
    setCartLoadingState(false, cartProductId);
    // Re-sync in case the cart changed part-way
    refreshAndHydrateCart().catch(() => {});
  }
}

async function hydrateCartProductCardsWithProductImages(cart) {
  const products = cart?.products || cart?.cart?.products || [];
  if (!products.length) return;

  if (!window.zid?.products?.get) {
    scheduleProductHydration(cart);
    return;
  }

  const cards = Array.from(document.querySelectorAll(".ananas-cart-item"));
  await Promise.all(
    cards.map(async (card) => {
      const imageWrap = card.querySelector("[data-cart-item-image-wrap]");
      const item = findCartItemForCard(card, products);
      if (!item) return;

      const product = await fetchProductDetailsForItem(item);
      const enhancedItem = mergeCartItemProductDetails(item, product);
      const enhancedProducts = products.map((productItem) => (productItem === item ? enhancedItem : productItem));
      hydrateCartProductCards({ products: enhancedProducts });

      if (!imageWrap) return;
      const imageUrl = getCartItemImage(enhancedItem) || (await fetchProductImage(enhancedItem.product_id, enhancedItem));
      if (imageUrl) {
        const existingImg = imageWrap.querySelector("[data-cart-item-image]");
        if (existingImg) {
          existingImg.src = imageUrl;
        } else {
          const img = document.createElement("img");
          img.src = imageUrl;
          img.alt = enhancedItem.product?.name || enhancedItem.name || "";
          img.loading = "lazy";
          img.className = "ananas-cart-item__image";
          img.setAttribute("data-cart-item-image", "");
          imageWrap.appendChild(img);
        }
      }
    })
  );

  if (hasMissingCartProductEnhancements()) {
    scheduleProductHydration(cart);
  }
}

function hasMissingCartProductEnhancements() {
  return Array.from(document.querySelectorAll(".ananas-cart-item")).some((card) => {
    const hasImage = Boolean(card.querySelector("[data-cart-item-image]"));
    const optionsWrap = card.querySelector("[data-cart-item-options]");
    const hasVariantSelect = Boolean(card.querySelector("[data-cart-variant-select]"));
    return !hasImage || (optionsWrap && !hasVariantSelect && !optionsWrap.children.length);
  });
}

function scheduleProductHydration(cart, delay = 350) {
  if (pendingProductHydrationTimer || productHydrationAttempts >= 20) return;
  productHydrationAttempts += 1;
  pendingProductHydrationTimer = window.setTimeout(async () => {
    pendingProductHydrationTimer = null;
    await hydrateCartProductCardsWithProductImages(cart || state.cart || window.cartObject);
  }, delay);
}

async function hydrateCartProductCardsFromApi(attempt = 0) {
  if (!window.zid?.cart?.get) {
    if (attempt < 10) {
      setTimeout(() => hydrateCartProductCardsFromApi(attempt + 1), 250);
    }
    return;
  }

  try {
    const cartData = await window.zid.cart.get();
    const cart = cartData?.cart || cartData;
    window.cartObject = cart;
    window.cartObj = cart;
    hydrateCartProductCards(cart);
    await hydrateCartProductCardsWithProductImages(cart);
  } catch (error) {
    hydrateCartProductCardsWithProductImages(state.cart || window.cartObject);
  }
}

// Auth: handleLoginAction / vitrin:auth:success live in ../features/layout.js (shared state)

// ===== Bundle Items =====

/**
 * Toggle bundle items visibility
 * Supports both desktop (bundle-{id}) and mobile (bundle-mobile-{id}) patterns
 * @param {string} id - Bundle element ID
 */
function toggleBundleItems(id) {
  const content = document.getElementById(id);
  if (!content) return;

  // Determine if mobile and extract product ID
  const isMobile = id.includes("bundle-mobile-");
  const productId = id.replace("bundle-mobile-", "").replace("bundle-", "");

  // Find the correct arrow based on desktop/mobile
  const arrowSelector = isMobile
    ? '[data-bundle-arrow-mobile="' + productId + '"]'
    : '[data-bundle-arrow="' + productId + '"]';
  const arrow = document.querySelector(arrowSelector);

  const isHidden = content.classList.contains("hidden");
  content.classList.toggle("hidden");
  content.classList.toggle("flex");

  if (arrow) {
    arrow.style.transform = isHidden ? "rotate(180deg)" : "";
  }
}

/**
 * Toggle custom fields visibility
 * @param {string} id - Custom fields element ID (custom-fields-{productId})
 */
function toggleCustomFields(id) {
  const content = document.getElementById(id);
  if (!content) return;

  const productId = id.replace("custom-fields-", "");
  const arrow = document.querySelector('[data-custom-fields-arrow="' + productId + '"]');

  const isHidden = content.classList.contains("hidden");
  content.classList.toggle("hidden");
  content.classList.toggle("flex");

  if (arrow) {
    arrow.style.transform = isHidden ? "rotate(180deg)" : "";
  }
}

// ===== Platform Integration =====

/**
 * Called by Vitrin platform when cart products HTML changes
 * This is the callback for client-side cart updates
 * @param {string} html - New HTML content
 * @param {Object} cart - Updated cart object
 */
function cartProductsHtmlChanged(html, cart) {
  // Update state
  state.cart = cart;

  // The cart page uses a custom product-card template; fetch the page fragment
  // so platform updates do not replace it with the default products_list markup.
  refreshAndHydrateCart(cart);

  // Update items count
  const itemsCount = document.querySelector("[data-cart-items-count]");
  if (itemsCount) {
    itemsCount.textContent = config.translations.itemsCount.replace("%(count)s", cart.products_count);
  }

  // Update totals
  updateCartTotals(cart, config);

  // Update free shipping progress
  updateFreeShippingProgress(cart, config);

  // Update cart badge
  if (window.cartManager) {
    window.cartManager.refreshBadge();
  }
}

// ===== Public API =====

const CartController = {
  init,
  state,

  // Auth
  handleLoginAction,

  // Product operations
  toggleBundleItems,
  updateQuantity: (cartId, productId, delta) => updateQuantity(cartId, productId, delta, refreshCartPage),

  // Loyalty
  applyLoyaltyRedemption: () => applyLoyaltyRedemption(refreshCartPage),
  removeLoyaltyRedemption: () => removeLoyaltyRedemption(refreshCartPage),

  // Coupon
  applyCoupon: (sourceElement) => applyCoupon(refreshCartPage, sourceElement),
  removeCoupon: (sourceElement) => removeCoupon(refreshCartPage, sourceElement),

  // Gift card
  editGiftCard,
  deleteGiftCard,
  handleGiftCardClick,

  // Platform integration
  cartProductsHtmlChanged,

  // AJAX refresh
  refreshCartPage
};

// ===== Global Exports (Platform Compatibility) =====

// Main API
window.CartPage = CartController;

// Platform callback aliases (backward compatibility)
window.toggleBundleItems = toggleBundleItems;
window.updateCartQuantity = CartController.updateQuantity;
window.handleLoginAction = handleLoginAction;
window.applyLoyaltyRedemption = CartController.applyLoyaltyRedemption;
window.removeLoyaltyRedemption = CartController.removeLoyaltyRedemption;
window.sendCoupon = CartController.applyCoupon;
window.deleteCoupon = CartController.removeCoupon;
window.editGiftCard = editGiftCard;
window.deleteGiftCard = deleteGiftCard;
window.handleGiftCardClick = handleGiftCardClick;
window.cartProductsHtmlChanged = cartProductsHtmlChanged;
window.refreshCartPage = refreshCartPage;

export default CartController;
