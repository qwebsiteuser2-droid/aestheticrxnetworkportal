const MAX_EDGE = 600;
const JPEG_QUALITY = 0.75;
const MAX_OUTPUT_BYTES = 150 * 1024;

/** Compress a profile photo on-device before upload (~600px, under ~150KB JPEG). */
export async function compressProfilePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
  );
  if (!blob) throw new Error('Compression failed');
  if (blob.size > MAX_OUTPUT_BYTES) {
    const tighter: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.6)
    );
    if (!tighter || tighter.size > MAX_OUTPUT_BYTES) {
      throw new Error('Image is still too large. Choose a smaller photo.');
    }
    return tighter;
  }
  return blob;
}
