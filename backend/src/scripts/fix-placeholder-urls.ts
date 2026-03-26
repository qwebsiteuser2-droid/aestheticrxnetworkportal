/**
 * Script to fix placeholder URLs in video advertisements
 * Removes via.placeholder.com URLs and replaces with local paths
 */

import { AppDataSource } from '../db/data-source';
import { VideoAdvertisement } from '../models/VideoAdvertisement';

const fixPlaceholderUrls = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Use raw SQL to find ads with placeholder URLs
    const adsWithPlaceholders = await AppDataSource.query(`
      SELECT id, video_url, image_url, slides, title
      FROM video_advertisements
      WHERE video_url LIKE '%via.placeholder.com%'
         OR image_url LIKE '%via.placeholder.com%'
         OR slides::text LIKE '%via.placeholder.com%'
    `);

    console.log(`Found ${adsWithPlaceholders.length} ads with placeholder URLs`);

    let fixedCount = 0;
    
    for (const adData of adsWithPlaceholders) {
      // Fix video_url using raw SQL
      if (adData.video_url && adData.video_url.includes('via.placeholder.com')) {
        await AppDataSource.query(
          `UPDATE video_advertisements SET video_url = NULL WHERE id = $1`,
          [adData.id]
        );
        console.log(`  Fixed video_url for ad: ${adData.id}`);
        fixedCount++;
      }

      // Fix image_url using raw SQL
      if (adData.image_url && adData.image_url.includes('via.placeholder.com')) {
        await AppDataSource.query(
          `UPDATE video_advertisements SET image_url = NULL WHERE id = $1`,
          [adData.id]
        );
        console.log(`  Fixed image_url for ad: ${adData.id}`);
        fixedCount++;
      }

      // Fix slides using raw SQL
      if (adData.slides) {
        try {
          const slides = typeof adData.slides === 'string' ? JSON.parse(adData.slides) : adData.slides;
          if (Array.isArray(slides)) {
            let hasChanges = false;
            const fixedSlides = slides.map((slide: any) => {
              if (slide && slide.url && slide.url.includes('via.placeholder.com')) {
                const slideNum = slide.url.match(/Slide\+(\d+)/)?.[1] || slide.url.match(/text=Slide%2B(\d+)/)?.[1] || '1';
                slide.url = `/uploads/test-media/images/slide-${slideNum}.png`;
                hasChanges = true;
                return slide;
              }
              return slide;
            });
            
            if (hasChanges) {
              await AppDataSource.query(
                `UPDATE video_advertisements SET slides = $1::jsonb WHERE id = $2`,
                [JSON.stringify(fixedSlides), adData.id]
              );
              console.log(`  Fixed slides for ad: ${adData.id}`);
              fixedCount++;
            }
          }
        } catch (e) {
          console.warn(`  Could not parse slides for ad ${adData.id}:`, e);
        }
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} ads`);
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error fixing placeholder URLs:', error);
    process.exit(1);
  }
};

fixPlaceholderUrls();

