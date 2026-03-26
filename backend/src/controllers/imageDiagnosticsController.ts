import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../db/data-source';
import { Product } from '../models/Product';
import { AuthenticatedRequest } from '../types/auth';
import { migrateUploadsToProductsPics } from '../scripts/migrate-uploads-to-products-pics';

/**
 * Diagnostic endpoint to check which images are missing
 */
export const checkMissingImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                      process.env.RAILWAY_PROJECT_ID || 
                      process.env.RAILWAY_PUBLIC_DOMAIN ||
                      (process.env.NODE_ENV === 'production' && process.env.PORT);
    
    const baseDir = isRailway ? '/app' : path.resolve(__dirname, '..');
    const uploadsDir = path.join(baseDir, 'uploads');
    const productsPicsDir = path.join(baseDir, 'products_pics');
    
    // Get all products from database
    const productRepository = AppDataSource.getRepository(Product);
    const products = await productRepository.find();
    
    const missingImages: Array<{ productId: string; productName: string; imageUrl: string; fullPath: string; exists: boolean }> = [];
    const existingImages: Array<{ productId: string; productName: string; imageUrl: string }> = [];
    
    for (const product of products) {
      if (!product.image_url) {
        continue;
      }
      
      // Determine which directory based on image_url
      let imagePath: string;
      if (product.image_url.startsWith('/uploads/')) {
        const fileName = product.image_url.replace('/uploads/', '');
        imagePath = path.join(uploadsDir, fileName);
      } else if (product.image_url.startsWith('/products_pics/')) {
        const fileName = product.image_url.replace('/products_pics/', '');
        imagePath = path.join(productsPicsDir, fileName);
      } else if (product.image_url.startsWith('uploads/')) {
        imagePath = path.join(uploadsDir, product.image_url.replace('uploads/', ''));
      } else if (product.image_url.startsWith('products_pics/')) {
        imagePath = path.join(productsPicsDir, product.image_url.replace('products_pics/', ''));
      } else {
        // Try both directories
        const fileName = product.image_url.replace(/^\/+/, '');
        imagePath = path.join(uploadsDir, fileName);
        if (!fs.existsSync(imagePath)) {
          imagePath = path.join(productsPicsDir, fileName);
        }
      }
      
      const exists = fs.existsSync(imagePath);
      
      if (exists) {
        existingImages.push({
          productId: product.id,
          productName: product.name,
          imageUrl: product.image_url
        });
      } else {
        missingImages.push({
          productId: product.id,
          productName: product.name,
          imageUrl: product.image_url,
          fullPath: imagePath,
          exists: false
        });
      }
    }
    
    // Check directory existence
    const uploadsDirExists = fs.existsSync(uploadsDir);
    const productsPicsDirExists = fs.existsSync(productsPicsDir);
    
    let uploadsFiles: string[] = [];
    let productsPicsFiles: string[] = [];
    
    if (uploadsDirExists) {
      try {
        uploadsFiles = fs.readdirSync(uploadsDir).filter(f => 
          /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
        );
      } catch (err) {
        console.error('Error reading uploads directory:', err);
      }
    }
    
    if (productsPicsDirExists) {
      try {
        productsPicsFiles = fs.readdirSync(productsPicsDir).filter(f => 
          /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
        );
      } catch (err) {
        console.error('Error reading products_pics directory:', err);
      }
    }
    
    res.json({
      success: true,
      data: {
        environment: {
          isRailway: !!isRailway,
          baseDir,
          nodeEnv: process.env.NODE_ENV
        },
        directories: {
          uploads: {
            path: uploadsDir,
            exists: uploadsDirExists,
            fileCount: uploadsFiles.length,
            files: uploadsFiles.slice(0, 20) // First 20 files
          },
          productsPics: {
            path: productsPicsDir,
            exists: productsPicsDirExists,
            fileCount: productsPicsFiles.length,
            files: productsPicsFiles.slice(0, 20) // First 20 files
          }
        },
        products: {
          total: products.length,
          withImages: products.filter(p => p.image_url).length,
          existingImages: existingImages.length,
          missingImages: missingImages.length
        },
        missingImages: missingImages.slice(0, 50), // First 50 missing
        existingImages: existingImages.slice(0, 50) // First 50 existing
      }
    });
  } catch (error: unknown) {
    console.error('Error checking missing images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Admin endpoint to migrate /uploads/ paths to /products_pics/
 * Updates all products with /uploads/ image paths to use /products_pics/ instead
 */
export const migrateUploadsPaths = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check admin permission
    if (!req.user?.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    await migrateUploadsToProductsPics();

    res.json({
      success: true,
      message: 'Successfully migrated /uploads/ paths to /products_pics/',
      data: {
        message: 'All products with /uploads/ image paths have been updated to /products_pics/'
      }
    });
  } catch (error: unknown) {
    console.error('Error migrating uploads paths:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate uploads paths',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Admin endpoint to reassign available images to products with missing images
 * This will assign any available images from products_pics to products that have missing images
 */
export const reassignAvailableImages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check admin permission
    if (!req.user?.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const productRepository = AppDataSource.getRepository(Product);
    const products = await productRepository.find({
      order: { slot_index: 'ASC' }
    });
    
    const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                      process.env.RAILWAY_PROJECT_ID || 
                      (process.env.NODE_ENV === 'production' && process.env.PORT);
    
    // Check both /app and /tmp on Railway
    const productsPicsDirs = isRailway 
      ? ['/app/products_pics', '/tmp/products_pics']
      : [path.resolve(__dirname, '../../products_pics')];
    
    let availableImages: string[] = [];
    for (const dir of productsPicsDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
          .filter(file => file.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/))
          .sort();
        availableImages = [...availableImages, ...files];
        console.log(`📁 Found ${files.length} images in ${dir}`);
      }
    }
    
    // Remove duplicates
    availableImages = [...new Set(availableImages)];
    
    if (availableImages.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No images found in products_pics directory'
      });
      return;
    }

    // Find products with missing images
    const productsWithMissingImages: Product[] = [];
    for (const product of products) {
      if (!product.image_url) {
        productsWithMissingImages.push(product);
        continue;
      }
      
      // Check if image exists
      let imageExists = false;
      for (const dir of productsPicsDirs) {
        const fileName = product.image_url.replace(/^.*\//, '');
        const imagePath = path.join(dir, fileName);
        if (fs.existsSync(imagePath)) {
          imageExists = true;
          break;
        }
      }
      
      if (!imageExists) {
        productsWithMissingImages.push(product);
      }
    }

    if (productsWithMissingImages.length === 0) {
      res.json({
        success: true,
        message: 'All products have valid images',
        data: { 
          reassigned: 0, 
          total: products.length,
          availableImages: availableImages.length
        }
      });
      return;
    }

    // Reassign available images
    let reassigned = 0;
    let imageIndex = 0;
    const reassignedProducts: Array<{ id: string; name: string; oldUrl: string; newUrl: string }> = [];

    for (const product of productsWithMissingImages) {
      if (imageIndex >= availableImages.length) {
        console.warn('⚠️ Ran out of available images');
        break;
      }
      
      const imageFile = availableImages[imageIndex];
      const newImageUrl = `/products_pics/${imageFile}`;
      const oldImageUrl = product.image_url || 'none';
      
      product.image_url = newImageUrl;
      await productRepository.save(product);
      
      reassignedProducts.push({
        id: product.id,
        name: product.name,
        oldUrl: oldImageUrl,
        newUrl: newImageUrl
      });
      
      reassigned++;
      imageIndex++;
    }

    console.log(`✅ Reassigned ${reassigned} products with available images`);

    res.json({
      success: true,
      message: `Reassigned ${reassigned} products with available images`,
      data: {
        reassigned,
        total: products.length,
        missing: productsWithMissingImages.length,
        availableImages: availableImages.length,
        reassignedProducts: reassignedProducts.slice(0, 20) // First 20
      }
    });
  } catch (error: unknown) {
    console.error('Error reassigning images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reassign images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Admin endpoint to fix products with missing upload images
 * Assigns products_pics images to products that have missing uploads images
 */
export const fixMissingUploadImages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check admin permission
    if (!req.user?.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const productRepository = AppDataSource.getRepository(Product);
    
    // Get all products with uploads images
    const products = await productRepository.find();
    
    const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                      process.env.RAILWAY_PROJECT_ID || 
                      (process.env.NODE_ENV === 'production' && process.env.PORT);
    
    const productsPicsDir = isRailway ? '/app/products_pics' : path.resolve(__dirname, '../../products_pics');
    
    let availableImages: string[] = [];
    if (fs.existsSync(productsPicsDir)) {
      availableImages = fs.readdirSync(productsPicsDir)
        .filter(file => file.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/))
        .sort();
    } else {
      res.status(404).json({
        success: false,
        message: `products_pics directory not found: ${productsPicsDir}`
      });
      return;
    }

    // Products that need fixing (have uploads images)
    const productsToFix = products.filter(p => 
      p.image_url && 
      (p.image_url.startsWith('/uploads/') || p.image_url.includes('/uploads/'))
    );

    if (productsToFix.length === 0) {
      res.json({
        success: true,
        message: 'No products need fixing',
        data: { fixed: 0, total: products.length }
      });
      return;
    }

    // Assign products_pics images to products with missing uploads
    let fixed = 0;
    let imageIndex = 0;
    const fixedProducts: Array<{ id: string; name: string; oldUrl: string; newUrl: string }> = [];

    for (const product of productsToFix) {
      if (imageIndex >= availableImages.length) {
        break;
      }

      const imageFile = availableImages[imageIndex % availableImages.length];
      const newImageUrl = `/products_pics/${imageFile}`;
      const oldUrl = product.image_url;
      
      product.image_url = newImageUrl;
      await productRepository.save(product);
      
      fixedProducts.push({
        id: product.id,
        name: product.name,
        oldUrl: oldUrl || '',
        newUrl: newImageUrl
      });
      
      fixed++;
      imageIndex++;
    }

    res.json({
      success: true,
      message: `Fixed ${fixed} products with missing upload images`,
      data: {
        fixed,
        total: products.length,
        productsToFix: productsToFix.length,
        fixedProducts: fixedProducts.slice(0, 20) // First 20
      }
    });
  } catch (error: unknown) {
    console.error('Error fixing missing images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix missing images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
