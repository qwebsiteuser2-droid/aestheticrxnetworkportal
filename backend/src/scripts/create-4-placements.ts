import { AppDataSource } from '../db/data-source';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';

async function create4Placements() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const areaConfigRepository = AppDataSource.getRepository(AdvertisementAreaConfig);

    // The 4 placements we need
    const placements = [
      {
        area_name: 'top_banner_highest_visibility' as any,
        display_name: 'Top banner - highest visibility on every page',
        description: 'Top banner - highest visibility on every page',
        device_type: 'all' as any,
        position: 'top',
        dimensions: { width: 1200, height: 200 },
        base_hourly_rate: 50.00,
        max_concurrent_ads: 3,
        current_active_ads: 0,
        rotation_interval_seconds: 10,
        auto_rotation_enabled: true,
        ads_closeable: true,
        allow_user_selection: true,
        visible_to_guests: true,
        is_active: true,
        priority: 0
      },
      {
        area_name: 'main_blue_area_prime_real_estate' as any,
        display_name: 'Main blue area - prime real estate for maximum impact',
        description: 'Main blue area - prime real estate for maximum impact',
        device_type: 'all' as any,
        position: 'center',
        dimensions: { width: 800, height: 400 },
        base_hourly_rate: 60.00,
        max_concurrent_ads: 2,
        current_active_ads: 0,
        rotation_interval_seconds: 5,
        auto_rotation_enabled: true,
        ads_closeable: true,
        allow_user_selection: true,
        visible_to_guests: true,
        is_active: true,
        priority: 0
      },
      {
        area_name: 'main_blue_area_b2b_platform' as any,
        display_name: 'Main blue area with B2B Platform title - prime real estate',
        description: 'Main blue area with B2B Platform title - prime real estate',
        device_type: 'all' as any,
        position: 'center',
        dimensions: { width: 800, height: 400 },
        base_hourly_rate: 60.00,
        max_concurrent_ads: 2,
        current_active_ads: 0,
        rotation_interval_seconds: 5,
        auto_rotation_enabled: true,
        ads_closeable: true,
        allow_user_selection: true,
        visible_to_guests: true,
        is_active: true,
        priority: 0
      },
      {
        area_name: 'purple_pink_content_area' as any,
        display_name: 'Purple/pink content area - engaged audience',
        description: 'Purple/pink content area - engaged audience',
        device_type: 'all' as any,
        position: 'center',
        dimensions: { width: 600, height: 300 },
        base_hourly_rate: 45.00,
        max_concurrent_ads: 2,
        current_active_ads: 0,
        rotation_interval_seconds: 5,
        auto_rotation_enabled: true,
        ads_closeable: true,
        allow_user_selection: true,
        visible_to_guests: true,
        is_active: true,
        priority: 0
      }
    ];

    console.log('📋 Creating 4 placements...\n');

    for (const placementData of placements) {
      const placement = areaConfigRepository.create(placementData);
      await areaConfigRepository.save(placement);
      console.log(`✅ Created: ${placement.display_name}`);
    }

    const final = await areaConfigRepository.find();
    console.log(`\n📊 Final count: ${final.length} placements`);
    final.forEach(p => console.log(`   - ${p.display_name}`));

    await AppDataSource.destroy();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

create4Placements();

