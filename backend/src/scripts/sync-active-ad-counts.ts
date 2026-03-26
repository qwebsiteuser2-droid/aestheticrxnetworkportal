import { AppDataSource } from '../db/data-source';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';
import { VideoAdvertisement, AdvertisementStatus } from '../models/VideoAdvertisement';

async function syncActiveAdCounts() {
  try {
    await AppDataSource.initialize();
    const areaConfigRepository = AppDataSource.getRepository(AdvertisementAreaConfig);
    const videoAdRepository = AppDataSource.getRepository(VideoAdvertisement);

    console.log('🔄 Syncing active ad counts for all placements...\n');

    // Get all placements
    const allPlacements = await areaConfigRepository.find();
    console.log(`📋 Found ${allPlacements.length} placements\n`);

    const now = new Date();

    // Map placement area names to all frontend area names that belong to them
    // This mapping aggregates ads from various frontend area names into the 4 main placements
    // Counts are calculated dynamically from actual active ads in the database
    const areaNameMapping: { [placementAreaName: string]: string[] } = {
      'top_banner_highest_visibility': [
        'desktop-header-banner',
        'mobile-header-banner',
        'top_banner_highest_visibility'
      ],
      'main_blue_area_prime_real_estate': [
        'hero_section_main',
        'mobile-hero-section',
        'main_blue_area_prime_real_estate'
      ],
      'main_blue_area_b2b_platform': [
        'hero_section_main',
        'mobile-hero-section',
        'main_blue_area_b2b_platform'
      ],
      'purple_pink_content_area': [
        'desktop_footer_banner',
        'mobile-contact-section',
        'research_papers_section',
        'mobile-research-papers',
        'purple_pink_content_area'
      ]
    };

    for (const placement of allPlacements) {
      const mappedNames = areaNameMapping[placement.area_name] || [placement.area_name];
      
      // Count ads from all mapped area names
      let totalCount = 0;
      for (const mappedName of mappedNames) {
        const activeAdsQuery = `
          SELECT COUNT(*) as count
          FROM video_advertisements
          WHERE selected_area = $1
            AND status = $2
            AND start_date IS NOT NULL
            AND end_date IS NOT NULL
            AND start_date <= $3
            AND end_date >= $3
        `;
        
        const activeCountResult = await AppDataSource.query(activeAdsQuery, [
          mappedName,
          AdvertisementStatus.ACTIVE,
          now
        ]);
        
        totalCount += parseInt(activeCountResult[0]?.count || '0', 10);
      }
      
      const actualActiveCount = totalCount;
      const currentStoredCount = placement.current_active_ads || 0;

      console.log(`📍 ${placement.display_name}`);
      console.log(`   Area: ${placement.area_name}`);
      console.log(`   Max Capacity: ${placement.max_concurrent_ads}`);
      console.log(`   Stored Count: ${currentStoredCount}`);
      console.log(`   Actual Active: ${actualActiveCount}`);

      // Cap at max capacity (can't exceed max)
      const cappedCount = Math.min(actualActiveCount, placement.max_concurrent_ads);
      
      if (cappedCount !== currentStoredCount) {
        // Update the count
        placement.current_active_ads = cappedCount;
        await areaConfigRepository.save(placement);
        console.log(`   ✅ UPDATED: ${currentStoredCount} → ${cappedCount} (capped from ${actualActiveCount})`);
      } else {
        console.log(`   ✓ Already correct`);
      }

      // Show details of active ads from all mapped source areas
      if (actualActiveCount > 0) {
        const activeAds = await AppDataSource.query(`
          SELECT id, title, selected_area, start_date, end_date, status
          FROM video_advertisements
          WHERE selected_area = ANY($1::text[])
            AND status = $2
            AND start_date IS NOT NULL
            AND end_date IS NOT NULL
            AND start_date <= $3
            AND end_date >= $3
          ORDER BY selected_area, created_at ASC
        `, [mappedNames, AdvertisementStatus.ACTIVE, now]);

        activeAds.forEach((ad: any, index: number) => {
          console.log(`      Ad ${index + 1}: ${ad.title} (Area: ${ad.selected_area}, ID: ${ad.id.substring(0, 8)}...)`);
        });
      }

      console.log('');
    }

    console.log('✅ Sync completed!\n');

    // Summary
    const finalPlacements = await areaConfigRepository.find();
    console.log('📊 Final Summary:');
    finalPlacements.forEach(p => {
      console.log(`   ${p.display_name}: ${p.current_active_ads}/${p.max_concurrent_ads}`);
    });

  } catch (error) {
    console.error('❌ Error syncing active ad counts:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

syncActiveAdCounts();

