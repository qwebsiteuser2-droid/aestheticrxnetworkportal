import { AppDataSource } from '../db/data-source';
import { Product } from '../models/Product';

/**
 * Migrate product images from /uploads/ to /products_pics/
 * This updates the database to use /products_pics/ paths for products
 * that currently have /uploads/ image paths
 */
const migrateUploadsToProductsPics = async (): Promise<void> => {
  try {
    console.log('🔄 Starting migration: /uploads/ → /products_pics/');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const productRepository = AppDataSource.getRepository(Product);
    
    // Find all products with /uploads/ image paths
    const products = await productRepository.find();
    
    console.log(`📦 Found ${products.length} products in database`);

    let migrated = 0;
    let notFound = 0;
    const migratedProducts: Array<{ id: string; name: string; oldUrl: string; newUrl: string }> = [];

    for (const product of products) {
      if (!product.image_url) {
        continue;
      }

      // Check if image_url starts with /uploads/
      if (product.image_url.startsWith('/uploads/') || product.image_url.includes('/uploads/')) {
        // Extract filename from /uploads/ path
        const oldImageUrl = product.image_url;
        const fileName = oldImageUrl.replace(/^.*\/uploads\//, '');
        const newImageUrl = `/products_pics/${fileName}`;
        
        // Update the product
        product.image_url = newImageUrl;
        await productRepository.save(product);
        
        migratedProducts.push({
          id: product.id,
          name: product.name,
          oldUrl: oldImageUrl,
          newUrl: newImageUrl
        });
        
        console.log(`✅ Migrated: ${product.name} (${product.id})`);
        console.log(`   Old: ${product.image_url}`);
        console.log(`   New: ${newImageUrl}`);
        
        migrated++;
      }
    }

    console.log('');
    console.log('🎉 Migration completed!');
    console.log(`📊 Migrated ${migrated} products`);
    console.log(`⚠️  ${notFound} products had issues`);
    
    if (migratedProducts.length > 0) {
      console.log('');
      console.log('📋 Migrated products:');
      migratedProducts.slice(0, 20).forEach(p => {
        console.log(`   - ${p.name}: ${p.oldUrl} → ${p.newUrl}`);
      });
      if (migratedProducts.length > 20) {
        console.log(`   ... and ${migratedProducts.length - 20} more`);
      }
    }

  } catch (error: unknown) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

// Run the script if called directly
if (require.main === module) {
  migrateUploadsToProductsPics()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { migrateUploadsToProductsPics };
