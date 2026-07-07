import { AppDataSource } from '../db/data-source';

let galleryColumnsReady: boolean | null = null;

/** Whether products.image_front_data (and related gallery columns) exist */
export async function productGalleryColumnsExist(): Promise<boolean> {
  if (galleryColumnsReady !== null) return galleryColumnsReady;
  try {
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    try {
      galleryColumnsReady = await runner.hasColumn('products', 'image_front_data');
    } finally {
      await runner.release();
    }
  } catch {
    galleryColumnsReady = false;
  }
  return galleryColumnsReady;
}

export function resetProductGalleryColumnsCache(): void {
  galleryColumnsReady = null;
}
