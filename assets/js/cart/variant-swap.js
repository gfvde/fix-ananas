/**
 * Cart variant swap (cart page + side cart).
 *
 * The Zid cart has no "change variant" call, so a swap is add(new) + remove(old).
 * Done naively that is not atomic: a failed remove leaves both lines in the cart.
 * Here the old line is only removed after the add succeeded, and if that remove
 * fails the added quantity is rolled back (line removed, or a pre-existing line
 * of the same variant restored to its previous quantity).
 */

const normalizeId = (id) =>
  String(id ?? "")
    .replace(/-/g, "")
    .toLowerCase();

function getProducts(cart) {
  return cart?.products || cart?.cart?.products || [];
}

function findLineForVariant(cart, variantId, excludeLineId) {
  const target = normalizeId(variantId);
  const exclude = normalizeId(excludeLineId);
  return getProducts(cart).find((line) => {
    if (exclude && normalizeId(line.id) === exclude) return false;
    return normalizeId(line.product_id ?? line.product?.id) === target;
  });
}

/**
 * @param {Object} params
 * @param {string} params.lineId    cart line (item) id currently holding the old variant
 * @param {string} params.variantId product id of the variant to switch to
 * @param {number} params.quantity  quantity to carry over
 * @returns {Promise<void>} rejects when the swap did not happen (cart left as before when possible)
 */
export async function swapCartVariant({ lineId, variantId, quantity }) {
  const cartApi = window.zid?.cart;
  if (!cartApi) throw new Error("Zid cart SDK not available");

  const qty = Math.max(1, Number(quantity) || 1);

  // Remember whether the target variant already has its own line (the add merges into it)
  let existingQty = null;
  try {
    const before = await cartApi.get();
    const existing = findLineForVariant(before, variantId, lineId);
    if (existing) existingQty = Number(existing.quantity) || 0;
  } catch {
    // Not fatal: without the snapshot a rollback removes the new line instead
  }

  // 1) Add the new variant. If this fails nothing changed.
  await cartApi.addProduct({ product_id: variantId, quantity: qty }, { showErrorNotification: true });

  // 2) Remove the old line only after the add succeeded.
  try {
    await cartApi.removeProduct({ product_id: lineId }, { showErrorNotification: true });
  } catch (removeError) {
    // 3) Roll back the add so the customer is not left with both lines.
    try {
      const after = await cartApi.get();
      const added = findLineForVariant(after, variantId, lineId);
      if (added) {
        if (existingQty) {
          await cartApi.updateProduct({ product_id: added.id, quantity: existingQty }, { showErrorNotification: false });
        } else {
          await cartApi.removeProduct({ product_id: added.id }, { showErrorNotification: false });
        }
      }
    } catch (rollbackError) {
      console.error("[Cart] Variant swap rollback failed:", rollbackError);
    }
    throw removeError;
  }
}
