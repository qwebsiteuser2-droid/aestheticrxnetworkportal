/** Paid-on-delivery: catalogue price may be blank until delivery / per-user discount. */
export const PRICE_TBD_AT_DELIVERY = 'Price TBD at delivery';

/**
 * Hide catalogue prices from end users for now (admin still stores real prices).
 * Flip to true when ready to show set amounts again.
 */
export const SHOW_CATALOGUE_PRICES_TO_USERS = false;

export type ProductPriceValue = string | number | null | undefined;

/** True when a catalogue price is present and parseable (including 0). */
export function hasProductPrice(price: ProductPriceValue): boolean {
  if (price === null || price === undefined || price === '') return false;
  const n = typeof price === 'string' ? parseFloat(price) : Number(price);
  return Number.isFinite(n);
}

/** Whether the storefront should treat this as a visible numeric price. */
export function hasVisibleProductPrice(price: ProductPriceValue): boolean {
  if (!SHOW_CATALOGUE_PRICES_TO_USERS) return false;
  return hasProductPrice(price);
}

export function parseProductPrice(price: ProductPriceValue): number | null {
  if (!hasProductPrice(price)) return null;
  const n = typeof price === 'string' ? parseFloat(String(price)) : Number(price);
  return Number.isFinite(n) ? n : null;
}

export function formatProductPriceNumber(price: ProductPriceValue): string {
  if (!SHOW_CATALOGUE_PRICES_TO_USERS) return PRICE_TBD_AT_DELIVERY;
  const n = parseProductPrice(price);
  if (n === null) return PRICE_TBD_AT_DELIVERY;
  return n.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

/** e.g. ₨1,200 or "Price TBD at delivery" */
export function formatProductPriceLabel(
  price: ProductPriceValue,
  opts?: { prefix?: string; forceShow?: boolean }
): string {
  if (!opts?.forceShow && !SHOW_CATALOGUE_PRICES_TO_USERS) {
    return PRICE_TBD_AT_DELIVERY;
  }
  const n = parseProductPrice(price);
  if (n === null) return PRICE_TBD_AT_DELIVERY;
  const prefix = opts?.prefix ?? '₨';
  return `${prefix}${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}
