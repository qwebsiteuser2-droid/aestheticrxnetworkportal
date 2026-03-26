import { AppDataSource } from '../db/data-source';
import { Product } from '../models/Product';
import fs from 'fs';
import path from 'path';

/**
 * Assign product images from products_pics folder to existing products
 */
const assignProductImages = async (): Promise<void> => {
  try {
    console.log('🖼️  Starting product image assignment...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const productRepository = AppDataSource.getRepository(Product);
    
    // Get all existing products ordered by slot_index
    const products = await productRepository.find({
      order: { slot_index: 'ASC' }
    });

    console.log(`📦 Found ${products.length} products in database`);

    // Get list of available images
    const imagesDir = '/app/products_pics';
    const imageFiles = fs.readdirSync(imagesDir)
      .filter(file => file.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/))
      .sort();

    console.log(`🖼️  Found ${imageFiles.length} images in products_pics folder`);

    // Assign images to products
    for (let i = 0; i < Math.min(products.length, imageFiles.length); i++) {
      const product = products[i];
      const imageFile = imageFiles[i];
      
      // Create the image URL path
      const imageUrl = `/products_pics/${imageFile}`;
      
      // Update the product with the image URL
      if (product) {
        product.image_url = imageUrl;
        await productRepository.save(product);
        
        console.log(`✅ Assigned image to Slot ${product.slot_index}: ${product.name} -> ${imageFile}`);
      }
    }

    console.log('🎉 Product image assignment completed successfully!');
    console.log(`📊 Updated ${Math.min(products.length, imageFiles.length)} products with images`);

  } catch (error: unknown) {
    console.error('❌ Product image assignment failed:', error);
    throw error;
  }
};

// Run the script if called directly
if (require.main === module) {
  assignProductImages()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { assignProductImages };
