import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import { PRODUCTS_PICS_DIR } from '../config/uploadConfig';

export type ProductImageField = 'image' | 'image_front' | 'image_back' | 'image_side';

export type ProductGalleryData = {
  image_data: string | null;
  image_url: string | null;
  image_front_data: string | null;
  image_back_data: string | null;
  image_side_data: string | null;
};

function readFileAsBase64DataUrl(file: Express.Multer.File): string | null {
  try {
    if (file.buffer?.length) {
      return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    const filePath = file.path || path.join(PRODUCTS_PICS_DIR, file.filename);
    let resolved = filePath;
    if (!fs.existsSync(resolved)) {
      const altPath = path.join(PRODUCTS_PICS_DIR, file.filename);
      if (!fs.existsSync(altPath)) {
        console.warn('⚠️ Product image file not found:', filePath, altPath);
        return null;
      }
      resolved = altPath;
    }
    const fileBuffer = fs.readFileSync(resolved);
    return `data:${file.mimetype};base64,${fileBuffer.toString('base64')}`;
  } catch (error) {
    console.error('❌ Error reading product image file:', error);
    return null;
  }
}

function firstFile(
  files: Express.Multer.File[] | undefined
): Express.Multer.File | undefined {
  return files?.[0];
}

function virtualImagePath(file: Express.Multer.File): string {
  const originalName = path.parse(file.originalname || 'image').name;
  const ext = path.extname(file.originalname || '') || '.png';
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return `/products_pics/${sanitizedName}-${uniqueSuffix}${ext}`;
}

/**
 * Parse multer .fields() upload into gallery columns.
 * `image` sets main catalog image (image_data + image_url).
 */
export function parseProductImageUploads(
  files: Record<string, Express.Multer.File[]> | undefined
): ProductGalleryData {
  const result: ProductGalleryData = {
    image_data: null,
    image_url: null,
    image_front_data: null,
    image_back_data: null,
    image_side_data: null,
  };

  if (!files) return result;

  const mainFile = firstFile(files.image);
  if (mainFile) {
    result.image_url = virtualImagePath(mainFile);
    result.image_data = readFileAsBase64DataUrl(mainFile);
    if (!result.image_data) {
      console.warn('⚠️ Catalog image upload could not be read into database');
    }
  }

  const frontFile = firstFile(files.image_front);
  if (frontFile) {
    result.image_front_data = readFileAsBase64DataUrl(frontFile);
    if (!result.image_front_data) {
      console.warn('⚠️ Front image upload could not be read into database');
    }
    if (!result.image_data && result.image_front_data) {
      result.image_data = result.image_front_data;
      result.image_url = virtualImagePath(frontFile);
    }
  }

  const backFile = firstFile(files.image_back);
  if (backFile) {
    result.image_back_data = readFileAsBase64DataUrl(backFile);
    if (!result.image_back_data) {
      console.warn('⚠️ Back image upload could not be read into database');
    }
  }

  const sideFile = firstFile(files.image_side);
  if (sideFile) {
    result.image_side_data = readFileAsBase64DataUrl(sideFile);
    if (!result.image_side_data) {
      console.warn('⚠️ Side image upload could not be read into database');
    }
  }

  return result;
}

export function applyGalleryToProduct(
  product: {
    image_data?: string | null;
    image_url?: string | null;
    image_front_data?: string | null;
    image_back_data?: string | null;
    image_side_data?: string | null;
  },
  gallery: ProductGalleryData,
  options?: { onlyIfProvided?: boolean }
): void {
  const only = options?.onlyIfProvided ?? false;

  if (gallery.image_url !== null && gallery.image_url !== undefined) {
    if (!only || gallery.image_url) product.image_url = gallery.image_url;
  }
  if (gallery.image_data) {
    product.image_data = gallery.image_data;
  }
  if (gallery.image_front_data) {
    product.image_front_data = gallery.image_front_data;
  }
  if (gallery.image_back_data) {
    product.image_back_data = gallery.image_back_data;
  }
  if (gallery.image_side_data) {
    product.image_side_data = gallery.image_side_data;
  }
}
