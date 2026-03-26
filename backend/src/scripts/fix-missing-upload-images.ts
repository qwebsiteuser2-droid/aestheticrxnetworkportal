import { AppDataSource } from '../db/data-source';
import { Product } from '../models/Product';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Fix products with missing upload images by assigning products_pics images
 * This is a temporary fix until uploads images can be re-uploaded
 */
const fixMissingUploadImages = async (): Promise<void> => {
  try {
    console.log('🔧 Fixing products with missing upload images...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const productRepository = AppDataSource.getRepository(Product);
    
    // Get all products with uploads images
    const products = await productRepository.find();
    
    console.log(`📦 Found ${products.length} products in database`);

    // Get available products_pics images
    const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                      process.env.RAILWAY_PROJECT_ID || 
                      (process.env.NODE_ENV === 'production' && process.env.PORT);
    
    const productsPicsDir = isRailway ? '/app/products_pics' : path.resolve(__dirname, '../../products_pics');
    
    let availableImages: string[] = [];
    if (fs.existsSync(productsPicsDir)) {
      availableImages = fs.readdirSync(productsPicsDir)
        .filter(file => file.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/))
        .sort();
      console.log(`🖼️  Found ${availableImages.length} images in products_pics`);
    } else {
      console.warn(`⚠️  products_pics directory not found: ${productsPicsDir}`);
      return;
    }

    // Products that need fixing (have uploads images)
    const productsToFix = products.filter(p => 
      p.image_url && 
      (p.image_url.startsWith('/uploads/') || p.image_url.includes('/uploads/'))
    );

    console.log(`🔍 Found ${productsToFix.length} products with uploads images`);

    if (productsToFix.length === 0) {
      console.log('✅ No products need fixing');
      return;
    }

    // Assign products_pics images to products with missing uploads
    let fixed = 0;
    let imageIndex = 0;

    for (const product of productsToFix) {
      if (imageIndex >= availableImages.length) {
        console.warn('⚠️  No more images available in products_pics');
        break;
      }

      const imageFile = availableImages[imageIndex % availableImages.length];
      const newImageUrl = `/products_pics/${imageFile}`;
      
      product.image_url = newImageUrl;
      await productRepository.save(product);
      
      console.log(`✅ Fixed: ${product.name} (slot ${product.slot_index}) -> ${imageFile}`);
      fixed++;
      imageIndex++;
    }

    console.log('');
    console.log('🎉 Fix completed!');
    console.log(`📊 Fixed ${fixed} products`);
    console.log('');
    console.log('💡 Note: Original uploads images are lost. Re-upload them through admin interface if needed.');

  } catch (error: unknown) {
    console.error('❌ Fix failed:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

// Run the script if called directly
if (require.main === module) {
  fixMissingUploadImages()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { fixMissingUploadImages };
