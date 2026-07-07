import { getBackendUrl } from '../config/urlConfig';

export type ProductImageView = 'main' | 'front' | 'back' | 'side';

const VIEW_FALLBACK_COLUMNS: Record<ProductImageView, string[]> = {
  main: ['image_data', 'image_front_data', 'image_back_data', 'image_side_data'],
  front: ['image_front_data', 'image_data'],
  back: ['image_back_data', 'image_data'],
  side: ['image_side_data', 'image_data'],
};

export function pickProductImageDataUrl(
  row: Record<string, string | null | undefined>,
  view: ProductImageView
): string | null {
  const columns = VIEW_FALLBACK_COLUMNS[view] || VIEW_FALLBACK_COLUMNS.main;
  for (const col of columns) {
    const value = row[col];
    if (value && typeof value === 'string' && value.length > 32) {
      return value;
    }
  }
  return null;
}

export function parseDataUrlImage(
  imageData: string
): { mimeType: string; buffer: Buffer } | null {
  const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64'),
  };
}

/** Public catalog image URL — always database-backed endpoint */
export function buildProductImagePublicUrl(productId: string, backendUrl?: string): string {
  const base = backendUrl || getBackendUrl();
  return `${base}/api/product-images/${productId}`;
}
