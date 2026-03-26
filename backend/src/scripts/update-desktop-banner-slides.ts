/**
 * Script to update Test Desktop Header Banner with 10 slides
 */

import { AppDataSource } from '../db/data-source';

const updateDesktopBanner = async () => {
  try {
    console.log('🔄 Initializing database connection...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    console.log('✅ Database connected');
    
    // Find the Test Desktop Header Banner
    const ad = await AppDataSource.query(`
      SELECT id, title FROM video_advertisements 
      WHERE title = 'Test Desktop Header Banner' 
      LIMIT 1
    `);
    
    if (!ad || ad.length === 0) {
      console.error('❌ Test Desktop Header Banner not found');
      process.exit(1);
    }
    
    const adId = ad[0].id;
    console.log(`✅ Found advertisement: ${ad[0].title} (${adId})`);
    
    // Create 10 slides
    const slides = Array.from({ length: 10 }, (_, i) => ({
      url: `https://via.placeholder.com/800x400/0066cc/ffffff?text=Slide+${i + 1}`,
      type: 'image',
      title: `Slide ${i + 1}`,
      description: `This is slide ${i + 1} of the desktop header banner advertisement`,
      duration: 5
    }));
    
    // Update the advertisement
    await AppDataSource.query(`
      UPDATE video_advertisements 
      SET 
        slides = $1::jsonb,
        slide_count = $2,
        slide_interval_seconds = $3,
        auto_slide_enabled = $4,
        updated_at = NOW()
      WHERE id = $5
    `, [JSON.stringify(slides), 10, 10, true, adId]);
    
    console.log('✅ Updated Test Desktop Header Banner with 10 slides');
    console.log(`   - Slide count: 10`);
    console.log(`   - Slide interval: 10 seconds`);
    console.log(`   - Auto-slide enabled: true`);
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: unknown) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
};

updateDesktopBanner();

