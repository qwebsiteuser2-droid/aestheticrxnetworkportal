/** Paid-on-delivery: invoice/UI when catalogue price is not set. */
export const PRICE_TBD_AT_DELIVERY = 'Price TBD at delivery';

/** Hide prices on customer-facing invoices / emails for now. */
export const SHOW_CATALOGUE_PRICES_TO_USERS = false;

export function hasProductPrice(price: unknown): boolean {
  if (price === null || price === undefined || price === '') return false;
  const n = typeof price === 'string' ? parseFloat(price) : Number(price);
  return Number.isFinite(n);
}

export function parseProductPrice(price: unknown): number | null {
  if (!hasProductPrice(price)) return null;
  const n = typeof price === 'string' ? parseFloat(String(price)) : Number(price);
  return Number.isFinite(n) ? n : null;
}

export function formatPriceOrTbd(price: unknown, opts?: { prefix?: string; forceShow?: boolean }): string {
  if (!opts?.forceShow && !SHOW_CATALOGUE_PRICES_TO_USERS) {
    return PRICE_TBD_AT_DELIVERY;
  }
  const n = parseProductPrice(price);
  if (n === null) return PRICE_TBD_AT_DELIVERY;
  const prefix = opts?.prefix ?? 'PKR ';
  return `${prefix}${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}
