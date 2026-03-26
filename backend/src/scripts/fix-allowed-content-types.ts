import { AppDataSource } from '../db/data-source';

async function fixAllowedContentTypes() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Update all areas to ensure they have proper allowed_content_types
    const updateQuery = `
      UPDATE advertisement_area_configs
      SET allowed_content_types = '["video", "image", "animation"]'::json
      WHERE allowed_content_types IS NULL 
         OR allowed_content_types::text = 'null'
         OR allowed_content_types::text = '[]'
         OR json_array_length(allowed_content_types) = 0;
    `;

    const result = await AppDataSource.query(updateQuery);
    console.log(`✅ Updated ${result.rowCount || 0} areas with default allowed_content_types`);

    // Verify the fix
    const verifyQuery = `
      SELECT area_name, display_name, allowed_content_types
      FROM advertisement_area_configs
      WHERE area_name LIKE 'mobile%'
      ORDER BY area_name;
    `;

    const areas = await AppDataSource.query(verifyQuery);
    console.log('\n📋 Mobile areas after fix:');
    areas.forEach((area: any) => {
      console.log(`  - ${area.area_name}: ${JSON.stringify(area.allowed_content_types)}`);
    });

    await AppDataSource.destroy();
    console.log('\n✅ Fix completed!');
  } catch (error) {
    console.error('❌ Error fixing allowed_content_types:', error);
    process.exit(1);
  }
}

fixAllowedContentTypes();

