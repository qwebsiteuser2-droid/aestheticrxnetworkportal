/** Product gallery view keys (matches backend /api/product-images?view=) */
export type ProductImageView = 'main' | 'front' | 'back' | 'side';

/**
 * Same-origin URL for product images (proxied by Next.js to the Railway backend).
 * Use in <img src={...}> on order page, homepage catalog, and product modal.
 */
export function getProductImageSrc(
  productId: string,
  view: ProductImageView = 'main'
): string {
  if (!productId) return '';
  const params = new URLSearchParams();
  if (view !== 'main') params.set('view', view);
  const qs = params.toString();
  return `/api/product-images/${productId}${qs ? `?${qs}` : ''}`;
}
