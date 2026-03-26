import { AppDataSource } from '../db/data-source';

async function checkAreaData() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const query = `
      SELECT 
        area_name, 
        display_name,
        allowed_content_types,
        is_active,
        allow_user_selection,
        current_active_ads,
        max_concurrent_ads
      FROM advertisement_area_configs 
      WHERE area_name = 'mobile_content_bottom'
      LIMIT 1;
    `;

    const result = await AppDataSource.query(query);
    
    if (result.length > 0) {
      const area = result[0];
      console.log('📋 Mobile Content Bottom Area Data:');
      console.log('  Area Name:', area.area_name);
      console.log('  Display Name:', area.display_name);
      console.log('  Allowed Content Types:', area.allowed_content_types);
      console.log('  Type of allowed_content_types:', typeof area.allowed_content_types);
      console.log('  Is Active:', area.is_active);
      console.log('  Allow User Selection:', area.allow_user_selection);
      console.log('  Current Active Ads:', area.current_active_ads);
      console.log('  Max Concurrent Ads:', area.max_concurrent_ads);
      
      // Try to parse
      let parsed: any = null;
      if (typeof area.allowed_content_types === 'string') {
        try {
          parsed = JSON.parse(area.allowed_content_types);
          console.log('  Parsed:', parsed);
        } catch (e) {
          console.log('  Parse Error:', e);
        }
      } else {
        parsed = area.allowed_content_types;
        console.log('  Already parsed:', parsed);
      }
      
      // Check if video is allowed
      if (parsed && Array.isArray(parsed)) {
        const hasVideo = parsed.some((t: string) => String(t).toLowerCase() === 'video');
        console.log('  ✅ Video allowed:', hasVideo);
      } else {
        console.log('  ⚠️  No restrictions (all types allowed)');
      }
    } else {
      console.log('❌ Area not found!');
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAreaData();
