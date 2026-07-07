import type { OrderResumeAction } from '@/lib/authRedirect';

export type CartMap = Record<string, number>;

export interface OrderResumeProduct {
  id: string;
  stock_quantity: number | null;
}

/** Apply post-login resume: add qty to cart and return whether cart modal should open. */
export function applyOrderResumeToCart(
  prev: CartMap,
  productId: string,
  product: OrderResumeProduct,
  action: OrderResumeAction,
  qty = 1
): { cart: CartMap; openCart: boolean } {
  if (action === 'location' || action === 'view') {
    return { cart: prev, openCart: false };
  }

  const originalStock = product.stock_quantity || 0;
  if (originalStock < 1) {
    return { cart: prev, openCart: action === 'buy' };
  }

  const current = prev[productId] || 0;
  const add = Math.min(qty, Math.max(0, originalStock - current));
  const next =
    add < 1
      ? prev
      : { ...prev, [productId]: current + add };

  return {
    cart: next,
    openCart: action === 'buy',
  };
}
