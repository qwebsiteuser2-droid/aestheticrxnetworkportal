import { AppDataSource } from '../db/data-source';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';

async function deleteUnwantedPlacements() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const areaConfigRepository = AppDataSource.getRepository(AdvertisementAreaConfig);

    // The 4 placements we want to KEEP
    const keepPlacements = [
      'Top banner - highest visibility on every page',
      'Main blue area - prime real estate for maximum impact',
      'Main blue area with B2B Platform title - prime real estate',
      'Purple/pink content area - engaged audience'
    ];

    // Get all placements
    const allPlacements = await areaConfigRepository.find();
    console.log(`📋 Found ${allPlacements.length} total placements`);

    // Find placements to delete (case-insensitive match)
    const toDelete: AdvertisementAreaConfig[] = [];
    const toKeep: AdvertisementAreaConfig[] = [];

    for (const placement of allPlacements) {
      const placementName = String(placement.display_name || '').toLowerCase().trim();
      const matches = keepPlacements.some(keep => {
        const keepLower = keep.toLowerCase();
        const keepPrefix = keepLower.split(' - ')[0] || '';
        return placementName === keepLower || (keepPrefix && placementName.includes(keepPrefix));
      });

      if (matches) {
        toKeep.push(placement);
        console.log(`✅ KEEPING: ${placement.display_name}`);
      } else {
        toDelete.push(placement);
        console.log(`❌ DELETING: ${placement.display_name}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Keeping: ${toKeep.length} placements`);
    console.log(`   Deleting: ${toDelete.length} placements`);

    // Delete unwanted placements
    if (toDelete.length > 0) {
      await areaConfigRepository.remove(toDelete);
      console.log(`\n✅ Successfully deleted ${toDelete.length} unwanted placements!`);
    } else {
      console.log(`\n✅ No placements to delete - all are already correct!`);
    }

    // Show final count
    const remaining = await areaConfigRepository.find();
    console.log(`\n📋 Final count: ${remaining.length} placements remaining`);
    remaining.forEach(p => console.log(`   - ${p.display_name}`));

    await AppDataSource.destroy();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteUnwantedPlacements();

