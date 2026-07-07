import { getSafeRedirectPath } from '@/lib/authRedirect';

/** Query action that opens the product details modal without changing the cart */
export const PRODUCT_SHARE_ACTION = 'view' as const;

export function buildProductSharePath(productId: string): string {
  const params = new URLSearchParams();
  params.set('productId', productId);
  params.set('action', PRODUCT_SHARE_ACTION);
  return `/order?${params.toString()}`;
}

export function buildProductShareUrl(productId: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const path = buildProductSharePath(productId);
  return `${base}${path}`;
}

/** Parse product share / resume params from a search string or full URL path+query */
export function parseProductLinkParams(search: string): {
  productId: string | null;
  action: string | null;
} {
  const q = search.startsWith('?') ? search : search.includes('?') ? search.slice(search.indexOf('?')) : `?${search}`;
  const params = new URLSearchParams(q);
  return {
    productId: params.get('productId'),
    action: params.get('action'),
  };
}

export async function copyProductShareLink(productId: string): Promise<string> {
  const url = buildProductShareUrl(productId);
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  }
  return url;
}

/** Login redirect that returns to a shared product link */
export function buildProductShareLoginUrl(productId: string): string {
  const returnPath = getSafeRedirectPath(buildProductSharePath(productId)) || '/order';
  return `/login?redirect=${encodeURIComponent(returnPath)}`;
}
