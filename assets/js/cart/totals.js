/**
 * Cart Totals Module
 *
 * Handles rendering of cart totals and free shipping progress bar.
 */

// SVG icons for discount section
const ICONS = {
  coupon: `<svg class="text-muted size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M13.333 7.333V4.667A.667.667 0 0012.667 4h-10A.667.667 0 002 4.667v2.666a1.333 1.333 0 010 2.667v2.667c0 .368.299.666.667.666h10a.667.667 0 00.666-.666V9.333a1.333 1.333 0 010-2.667z" /></svg>`,
  giftCard: `<svg class="text-muted size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M14 5.333h-1.82a2 2 0 00.153-.767 2 2 0 00-2-2c-.78 0-1.467.433-1.82 1.1L8 4.487l-.513-.82A2.005 2.005 0 005.667 2.566a2 2 0 00-2 2c0 .273.06.533.153.767H2a1.333 1.333 0 00-1.333 1.333V8c0 .367.3.667.666.667h.334v4c0 .733.6 1.333 1.333 1.333h10c.733 0 1.333-.6 1.333-1.333v-4h.334c.366 0 .666-.3.666-.667V6.667A1.333 1.333 0 0014 5.333zm-3.667-1.767a.667.667 0 01.667.667.667.667 0 01-.667.667H8.867l.666-1.067a.664.664 0 01.8-.267zm-4.666 0a.664.664 0 01.8.267l.666 1.067H5.667A.667.667 0 015 4.233a.667.667 0 01.667-.667z" /></svg>`,
  loyalty: `<svg class="text-muted size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.333l1.987 4.027 4.446.647-3.217 3.133.76 4.427L8 11.387l-3.976 2.18.76-4.427-3.217-3.133 4.446-.647L8 1.333z" /></svg>`
};

/**
 * Update cart totals display
 * @param {Object} cart - Cart object from API
 * @param {Object} config - Configuration object with translations
 */
export function updateCartTotals(cart, config) {
  if (!cart || !cart.totals) return;

  const totalsContainer = document.querySelector("[data-cart-totals]");
  if (!totalsContainer) return;

  if (document.querySelector("[data-cart-summary-root]")) {
    updateCustomCartSummary(cart, config);
    return;
  }

  const translations = config?.translations || {};
  const itemsCountText = (translations.itemsCount || "%(count)s items").replace("%(count)s", cart.products_count);
  const couponCode = cart.coupon?.code || "";
  const giftCardDetails = cart.gift_card_details;
  const loyaltyRedemption = cart.loyalty_applied_redemption_method;

  let totalsHtml = "";
  let totalRow = "";

  for (let i = 0; i < cart.totals.length; i++) {
    const total = cart.totals[i];

    if (total.code === "sub_totals") {
      totalsHtml +=
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="text-foreground text-sm">' +
        total.title +
        ' <span class="text-muted" data-cart-items-count>. ' +
        itemsCountText +
        "</span></span>" +
        '<span class="text-foreground text-sm shrink-0 text-end">' +
        total.value_string +
        "</span></div>";
    } else if (total.code === "shipping") {
      totalsHtml +=
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="text-foreground text-sm">' +
        total.title +
        "</span>" +
        '<span class="text-foreground text-sm shrink-0 text-end">' +
        total.value_string +
        "</span></div>";
    } else if (total.code === "discount" || total.code === "coupon_discount" || total.code === "products_discount") {
      // Helper to format discount value with single negative sign
      const formatDiscount = (value) => {
        const str = String(value || "");
        return str.startsWith("-") ? str : "-" + str;
      };

      let discountHtml =
        '<div class="flex flex-col gap-2">' +
        '<span class="text-foreground text-sm">' +
        (translations.discount || "Discount") +
        "</span>";

      if (couponCode) {
        discountHtml +=
          '<div class="flex items-center gap-1">' +
          ICONS.coupon +
          '<span class="text-muted text-sm flex-1">' +
          couponCode +
          "</span>" +
          '<span class="text-success text-sm shrink-0 text-end">' +
          formatDiscount(total.value_string) +
          "</span></div>";
      } else {
        discountHtml +=
          '<div class="flex items-center justify-between gap-2">' +
          '<span class="text-muted text-sm">' +
          total.title +
          "</span>" +
          '<span class="text-success text-sm shrink-0 text-end">' +
          formatDiscount(total.value_string) +
          "</span></div>";
      }

      if (giftCardDetails && giftCardDetails.code) {
        discountHtml +=
          '<div class="flex items-center gap-1">' +
          ICONS.giftCard +
          '<span class="text-muted text-sm flex-1">' +
          giftCardDetails.code +
          "</span>" +
          '<span class="text-success text-sm shrink-0 text-end">' +
          formatDiscount(giftCardDetails.amount_string) +
          "</span></div>";
      }

      if (loyaltyRedemption) {
        discountHtml +=
          '<div class="flex items-center gap-1">' +
          ICONS.loyalty +
          '<span class="text-muted text-sm flex-1">' +
          (translations.loyalty || "Loyalty") +
          " " +
          loyaltyRedemption.points_to_redeem +
          "</span>" +
          '<span class="text-success text-sm shrink-0 text-end">' +
          formatDiscount(loyaltyRedemption.reward.discount_amount) +
          " " +
          (cart.currency?.cart_currency?.code || "") +
          "</span></div>";
      }

      discountHtml += "</div>";
      totalsHtml += discountHtml;
    } else if (total.code === "tax" || total.code === "vat") {
      totalsHtml +=
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="text-foreground text-sm">' +
        total.title +
        "</span>" +
        '<span class="text-foreground text-sm shrink-0 text-end">' +
        total.value_string +
        "</span></div>";
    } else if (total.code === "total") {
      totalRow =
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="text-foreground text-sm font-semibold">' +
        total.title +
        "</span>" +
        '<span class="text-foreground text-sm font-semibold shrink-0 text-end">' +
        total.value_string +
        "</span></div>";
    } else {
      totalsHtml +=
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="text-foreground text-sm">' +
        total.title +
        "</span>" +
        '<span class="text-foreground text-sm shrink-0 text-end">' +
        total.value_string +
        "</span></div>";
    }
  }

  totalsContainer.innerHTML = totalsHtml + totalRow;
}

function findTotal(cart, code) {
  return cart.totals?.find((total) => total.code === code);
}

function findFirstTotal(cart, codes) {
  for (const code of codes) {
    const total = findTotal(cart, code);
    if (total) return total;
  }

  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  if (typeof value === "number") return value;

  const normalized = String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[^\d.-]/g, "");
  return Number(normalized);
}

function findFirstNumber(...values) {
  for (const value of values) {
    const number = toNumber(value);
    if (Number.isFinite(number)) return number;
  }

  return NaN;
}

function getTotalValue(cart) {
  const total = findTotal(cart, "total");
  return findFirstNumber(
    total?.value,
    total?.amount,
    total?.value_string,
    cart?.total_value,
    cart?.total,
    cart?.total_string,
    cart?.cart?.total_value,
    cart?.cart?.total
  );
}

function getCartProgressBaseValue(cart) {
  const productsSubtotal = getProductsSubtotalValue(cart);
  return Number.isFinite(productsSubtotal) ? productsSubtotal : getTotalValue(cart);
}

function getFreeShippingCondition(cart) {
  return (
    cart?.free_shipping_rule?.subtotal_condition ||
    cart?.cart?.free_shipping_rule?.subtotal_condition ||
    cart?.shipping?.free_shipping_rule?.subtotal_condition ||
    cart?.free_shipping?.subtotal_condition ||
    cart?.free_shipping_condition ||
    null
  );
}

function getFreeShippingState(cart) {
  const condition = getFreeShippingCondition(cart);
  if (!condition) return null;

  const status = condition.status || "";
  const remainingRaw =
    condition.remaining ??
    condition.remaining_amount ??
    condition.remaining_value ??
    condition.amount_remaining ??
    condition.left_to_free_shipping ??
    0;
  const remainingNumber = findFirstNumber(remainingRaw);
  const totalValue = getCartProgressBaseValue(cart);
  const minSubtotal = findFirstNumber(
    condition.min_subtotal,
    condition.minimum_subtotal,
    condition.min,
    condition.target,
    condition.amount,
    Number.isFinite(totalValue) && Number.isFinite(remainingNumber) ? totalValue + remainingNumber : NaN
  );
  const rawPercentage = findFirstNumber(
    condition.products_subtotal_percentage_from_min,
    condition.percentage,
    condition.progress_percentage,
    condition.percent
  );
  const calculatedPercentage =
    Number.isFinite(rawPercentage) || !Number.isFinite(minSubtotal) || minSubtotal <= 0 || !Number.isFinite(totalValue)
      ? rawPercentage
      : (totalValue / minSubtotal) * 100;
  const percentage = (status === "applied" || remainingNumber <= 0)
    ? 100
    : Math.max(0, Math.min(100, Number.isFinite(calculatedPercentage) ? calculatedPercentage : 0));

  return {
    status: status || (percentage >= 100 ? "applied" : ""),
    remaining: remainingRaw,
    percentage
  };
}

function getProductsSubtotalValue(cart) {
  const products = Array.isArray(cart?.products) ? cart.products : [];
  if (!products.length) return NaN;

  let hasValue = false;
  const subtotal = products.reduce((sum, item) => {
    const lineTotal = findFirstNumber(
      item.total,
      item.total_value,
      item.total_price,
      item.line_total,
      item.total_string,
      item.total_formatted
    );

    if (Number.isFinite(lineTotal)) {
      hasValue = true;
      return sum + lineTotal;
    }

    const unitPrice = findFirstNumber(
      item.price,
      item.sale_price,
      item.product?.sale_price,
      item.product?.price,
      item.price_value,
      item.price_string,
      item.price_formatted
    );
    const quantity = findFirstNumber(item.quantity) || 1;

    if (Number.isFinite(unitPrice)) {
      hasValue = true;
      return sum + unitPrice * quantity;
    }

    return sum;
  }, 0);

  return hasValue ? subtotal : NaN;
}

function formatCurrencyValue(value, referenceValue, cart) {
  if (!Number.isFinite(value)) return referenceValue || "";

  const formattedAmount = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const reference = String(referenceValue || "");
  const referenceNumber = reference.match(/[\d٠-٩٬,]+(?:[.,٫]\d+)?/);

  if (referenceNumber) {
    return reference.replace(referenceNumber[0], formattedAmount);
  }

  const currencyCode = cart?.currency?.cart_currency?.code || "";
  return currencyCode ? `${formattedAmount} ${currencyCode}` : formattedAmount;
}

function placeCurrencyBeforeAmount(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const sarGlyph = text.match(/^(-?)\s*([\d,]+(?:\.\d+)?)\s*(﷼|ر\.س|ريال|SAR)$/i);
  if (sarGlyph) return `${sarGlyph[1]}${sarGlyph[2]} ${sarGlyph[3]}`;

  const sarPrefix = text.match(/^(-?)\s*(SAR|ريال|ر\.س|﷼)\s*([\d,]+(?:\.\d+)?)/i);
  if (sarPrefix) return `${sarPrefix[1]}${sarPrefix[3]} ${sarPrefix[2]}`;

  return text;
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = placeCurrencyBeforeAmount(value);
  });
}

function formatDiscountValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.startsWith("-") ? text : `-${text}`;
}

function getCouponDiscountValue(cart) {
  const coupon = cart?.coupon || {};
  return findFirstNumber(
    coupon.amount,
    coupon.discount_amount,
    coupon.discount_value,
    coupon.value,
    coupon.amount_string,
    coupon.discount_amount_string,
    coupon.discount_string
  );
}

function getDiscountFromCollections(cart) {
  const collections = [cart?.discounts, cart?.coupon_discounts, cart?.applied_discounts].filter(Array.isArray);
  let totalDiscount = 0;
  let hasDiscount = false;

  collections.flat().forEach((discount) => {
    const value = findFirstNumber(
      discount?.value,
      discount?.amount,
      discount?.discount_amount,
      discount?.discount_value,
      discount?.value_string,
      discount?.amount_string
    );
    if (!Number.isFinite(value)) return;
    hasDiscount = true;
    totalDiscount += Math.abs(value);
  });

  return hasDiscount ? totalDiscount : NaN;
}

function getDiscountText(cart, discountTotal, productsSubtotal, fallbackSubtotalText) {
  const total = findTotal(cart, "total");
  const directText =
    discountTotal?.value_string ||
    discountTotal?.amount_string ||
    discountTotal?.formatted ||
    discountTotal?.value_formatted ||
    "";
  if (directText) return formatDiscountValue(directText);

  const directValue = findFirstNumber(discountTotal?.value, discountTotal?.amount, discountTotal?.discount_amount);
  if (Number.isFinite(directValue) && directValue !== 0) {
    return formatCurrencyValue(-Math.abs(directValue), fallbackSubtotalText || total?.value_string, cart);
  }

  const couponValue = getCouponDiscountValue(cart);
  if (Number.isFinite(couponValue) && couponValue !== 0) {
    return formatCurrencyValue(-Math.abs(couponValue), fallbackSubtotalText || total?.value_string, cart);
  }

  const collectionDiscount = getDiscountFromCollections(cart);
  if (Number.isFinite(collectionDiscount) && collectionDiscount !== 0) {
    return formatCurrencyValue(-Math.abs(collectionDiscount), fallbackSubtotalText || total?.value_string, cart);
  }

  const totalValue = getTotalValue(cart);
  if (cart?.coupon?.code && Number.isFinite(productsSubtotal) && Number.isFinite(totalValue) && productsSubtotal > totalValue) {
    return formatCurrencyValue(-(productsSubtotal - totalValue), fallbackSubtotalText || total?.value_string, cart);
  }

  return "";
}

function updateCustomCartSummary(cart, config) {
  const translations = config?.translations || {};
  const subtotal = findFirstTotal(cart, ["sub_totals", "subtotal", "sub_total", "products_subtotal", "products_total"]);
  const shipping = findTotal(cart, "shipping");
  const discount = findFirstTotal(cart, [
    "discount",
    "coupon_discount",
    "products_discount",
    "cart_discount",
    "coupon",
    "discounts"
  ]);
  const total = findTotal(cart, "total");
  const itemsCountText = (translations.itemsCount || "%(count)s items").replace("%(count)s", cart.products_count || 0);
  const productsSubtotal = getProductsSubtotalValue(cart);
  const fallbackSubtotalText =
    subtotal?.value_string ||
    cart.sub_total_string ||
    cart.subtotal_string ||
    cart.products_subtotal_string ||
    cart.products_total_string ||
    total?.value_string ||
    "";
  const productsSubtotalText = formatCurrencyValue(productsSubtotal, fallbackSubtotalText, cart);

  setText("[data-cart-summary-subtotal]", productsSubtotalText || fallbackSubtotalText);
  setText("[data-cart-summary-shipping]", shipping?.value_string || "-");
  const discountText = getDiscountText(cart, discount, productsSubtotal, productsSubtotalText || fallbackSubtotalText);
  setText("[data-cart-summary-discount]", discountText);
  document.querySelectorAll(".cart-summary__row--discount").forEach((row) => {
    row.classList.toggle("hidden", !discountText);
  });
  setText("[data-cart-summary-total]", total?.value_string || "");
  setText("[data-cart-summary-checkout-total]", total?.value_string || "");
  setText("[data-cart-mobile-total]", total?.value_string || "");
  // Show original subtotal price (strikethrough) in mobile checkout bar only when there's a discount
  const compareEls = document.querySelectorAll("[data-cart-mobile-compare]");
  if (discountText && (productsSubtotalText || fallbackSubtotalText)) {
    compareEls.forEach((el) => {
      el.textContent = productsSubtotalText || fallbackSubtotalText;
      el.style.display = "";
    });
  } else {
    compareEls.forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
  }
  setText("[data-cart-items-count]", `(${itemsCountText})`);
}

/**
 * Update free shipping progress bar
 * @param {Object} cart - Cart object from API
 * @param {Object} config - Configuration object with translations
 */
export function updateFreeShippingProgress(cart, config) {
  const freeShippingSections = document.querySelectorAll("[data-free-shipping-bar]");
  if (!freeShippingSections.length) return;

  const translations = config?.translations || {};
  const freeShippingState = getFreeShippingState(cart);

  freeShippingSections.forEach((freeShippingSection) => {
    const existingRemaining = freeShippingSection.dataset.freeShippingRemaining || "0";
    const existingPercentage = Number(freeShippingSection.dataset.freeShippingPercentage || 0);
    const cartProgressValue = getCartProgressBaseValue(cart);
    const existingTarget = toNumber(freeShippingSection.dataset.freeShippingTarget);
    const state = freeShippingState || (() => {
      const target = Number.isFinite(existingTarget)
        ? existingTarget
        : Number.isFinite(cartProgressValue)
          ? cartProgressValue + findFirstNumber(existingRemaining)
          : NaN;

      if (!Number.isFinite(target) || target <= 0) {
        return {
          status: "",
          remaining: existingRemaining,
          percentage: Math.max(0, Math.min(100, existingPercentage))
        };
      }

      const remainingValue = Math.max(0, target - (Number.isFinite(cartProgressValue) ? cartProgressValue : 0));
      const referenceRemaining = existingRemaining || "";
      const remainingText = formatCurrencyValue(remainingValue, referenceRemaining, cart);

      return {
        status: remainingValue <= 0 ? "applied" : "",
        remaining: remainingText,
        percentage: Math.max(0, Math.min(100, (cartProgressValue / target) * 100)),
        target
      };
    })();

    if (!state) {
      return;
    }

    freeShippingSection.classList.remove("hidden");

    const status = state.status || "";
    const percentage = status === "applied" ? 100 : Math.max(0, Math.min(100, Number(state.percentage) || 0));
    const remaining = state.remaining || "0";
    freeShippingSection.dataset.freeShippingRemaining = remaining;
    freeShippingSection.dataset.freeShippingPercentage = String(percentage);
    if (Number.isFinite(state.target)) {
      freeShippingSection.dataset.freeShippingTarget = String(state.target);
    } else {
      const remainingValue = findFirstNumber(remaining);
      const target = Number.isFinite(cartProgressValue) && Number.isFinite(remainingValue)
        ? cartProgressValue + remainingValue
        : NaN;
      if (Number.isFinite(target) && target > 0) {
        freeShippingSection.dataset.freeShippingTarget = String(target);
      }
    }

    const message = freeShippingSection.querySelector("[data-free-shipping-message]");
    if (message) {
      const riyalSvg = `<svg class="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="12" height="14" style="display:inline-block;vertical-align:-0.1em"><path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/><path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/></svg>`;
      const remainingNum = remaining.replace(/\s*SAR\s*/i, "").trim();
      if (status === "applied") {
        message.innerHTML = translations.freeShippingApplied || "Free shipping applied!";
      } else {
        const template = translations.addMoreForFreeShipping || "Add %(total)s more to get free shipping";
        message.innerHTML = template.replace("%(total)s", remainingNum + " " + riyalSvg);
      }
    }

    const progressWrapper = freeShippingSection.querySelector("[data-free-shipping-progress-wrapper]");
    const progressBar = freeShippingSection.querySelector("[data-free-shipping-progress-bar]");
    const percentageText = freeShippingSection.querySelector("[data-free-shipping-percentage]");
    const successIndicator = freeShippingSection.querySelector("[data-free-shipping-success]");

    if (progressWrapper) progressWrapper.classList.remove("hidden");
    if (successIndicator) successIndicator.classList.toggle("hidden", status !== "applied");
    if (progressBar) progressBar.style.width = percentage + "%";
    if (percentageText) percentageText.textContent = percentage + "%";
  });
}

/**
 * Update payment widgets (Tamara, Tabby) after cart changes
 */
export function updatePaymentWidgets() {
  const cartObj = window.cartObj;
  if (!cartObj || !cartObj.totals) return;

  const totalAmount = cartObj.totals.find((t) => t.code === "total");
  if (!totalAmount) return;

  // Update Tamara widget
  try {
    const tamaraWidget = document.querySelector("tamara-widget");
    if (tamaraWidget && window.TamaraWidgetV2) {
      tamaraWidget.setAttribute("amount", totalAmount.value);
      window.TamaraWidgetV2.refresh();
    }
  } catch (err) {
    console.error("Tamara update error:", err);
  }

  // Update Tabby widget
  try {
    const tabbyElm = document.querySelector(".tabby-cart-widget");
    if (tabbyElm && window.TabbyPromo) {
      window.TabbyPromo = new TabbyPromo.constructor({
        selector: ".tabby-cart-widget",
        currency: tabbyElm.getAttribute("data-currency"),
        lang: tabbyElm.getAttribute("data-lang"),
        price: totalAmount.value,
        installmentsCount: 4,
        source: "cart"
      });
    }
  } catch (err) {
    console.error("Tabby update error:", err);
  }
}

/**
 * Update loyalty points display after cart changes
 * @param {Object} config - Configuration object
 */
export function updateLoyaltyDisplay(config) {
  const cartObj = window.cartObj;
  if (!cartObj || !cartObj.totals) return;

  const totalAmount = cartObj.totals.find((t) => t.code === "total");
  if (!totalAmount) return;

  // Call system's loyalty calculation if available
  if (window.loyaltyCalculations) {
    window.loyaltyCalculations(totalAmount.value);
  }
}
