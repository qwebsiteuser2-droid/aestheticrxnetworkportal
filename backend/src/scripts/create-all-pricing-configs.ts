import { AppDataSource } from '../db/data-source';
import { AdvertisementPricingConfig, PlacementArea, AdvertisementType, DurationUnit } from '../models/AdvertisementPricingConfig';

// Define all possible values
const PLACEMENT_AREAS: PlacementArea[] = [
  PlacementArea.TOP_BANNER_HIGHEST_VISIBILITY,
  PlacementArea.MAIN_BLUE_AREA_PRIME_REAL_ESTATE,
  PlacementArea.MAIN_BLUE_AREA_B2B_PLATFORM,
  PlacementArea.PURPLE_PINK_CONTENT_AREA
];

const AD_TYPES: AdvertisementType[] = [
  AdvertisementType.VIDEO,
  AdvertisementType.IMAGE,
  AdvertisementType.ANIMATION,
  AdvertisementType.GENERAL,
  AdvertisementType.COMPREHENSIVE,
  AdvertisementType.COVERING
];

const TIME_UNITS: DurationUnit[] = [
  DurationUnit.HOUR,
  DurationUnit.DAY,
  DurationUnit.WEEK,
  DurationUnit.MONTH
];

const QUITABLE_OPTIONS = [true, false];

// Base pricing multipliers
const PLACEMENT_MULTIPLIERS: { [key: string]: number } = {
  [PlacementArea.TOP_BANNER_HIGHEST_VISIBILITY]: 1.0,      // Highest visibility = base price
  [PlacementArea.MAIN_BLUE_AREA_PRIME_REAL_ESTATE]: 1.2,  // Prime real estate = 20% more
  [PlacementArea.MAIN_BLUE_AREA_B2B_PLATFORM]: 1.15,      // B2B platform = 15% more
  [PlacementArea.PURPLE_PINK_CONTENT_AREA]: 0.9           // Content area = 10% less
};

const AD_TYPE_MULTIPLIERS: { [key: string]: number } = {
  [AdvertisementType.VIDEO]: 1.0,           // Base
  [AdvertisementType.IMAGE]: 0.7,          // 30% less
  [AdvertisementType.ANIMATION]: 0.85,      // 15% less
  [AdvertisementType.GENERAL]: 0.6,        // 40% less
  [AdvertisementType.COMPREHENSIVE]: 1.3,   // 30% more
  [AdvertisementType.COVERING]: 1.5        // 50% more
};

const TIME_UNIT_BASE_PRICES: { [key: string]: number } = {
  [DurationUnit.HOUR]: 50,      // Base: PKR 50/hour
  [DurationUnit.DAY]: 1000,     // Base: PKR 1000/day
  [DurationUnit.WEEK]: 6000,    // Base: PKR 6000/week
  [DurationUnit.MONTH]: 20000   // Base: PKR 20000/month
};

const QUITABLE_MULTIPLIER = {
  true: 1.0,   // Quitable = base price
  false: 1.2   // Non-quitable = 20% more (users can't close it)
};

async function createAllPricingConfigs() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const pricingRepo = AppDataSource.getRepository(AdvertisementPricingConfig);

    // Clear existing configs (optional - comment out if you want to keep existing)
    // await pricingRepo.clear();
    // console.log('🗑️  Cleared existing pricing configs');

    const configs: AdvertisementPricingConfig[] = [];
    let createdCount = 0;
    let skippedCount = 0;

    console.log('📝 Creating all pricing configuration combinations...\n');

    for (const placement of PLACEMENT_AREAS) {
      for (const adType of AD_TYPES) {
        for (const timeUnit of TIME_UNITS) {
          for (const isQuitable of QUITABLE_OPTIONS) {
            // Check if config already exists
            const existing = await pricingRepo.findOne({
              where: {
                placement_area: placement,
                advertisement_type: adType,
                duration_unit: timeUnit,
                is_quitable: isQuitable
              }
            });

            if (existing) {
              skippedCount++;
              continue;
            }

            // Calculate price based on multipliers
            const basePrice = TIME_UNIT_BASE_PRICES[timeUnit];
            const placementMultiplier = PLACEMENT_MULTIPLIERS[placement];
            const adTypeMultiplier = AD_TYPE_MULTIPLIERS[adType];
            const quitableMultiplier = QUITABLE_MULTIPLIER[isQuitable];

            const calculatedPrice = Math.round(
              basePrice * placementMultiplier * adTypeMultiplier * quitableMultiplier
            );

            const config = pricingRepo.create({
              placement_area: placement,
              advertisement_type: adType,
              duration_unit: timeUnit,
              is_quitable: isQuitable,
              unit_price: calculatedPrice,
              description: `${placement.replace(/_/g, ' ')} - ${adType} - ${timeUnit} - ${isQuitable ? 'Quitable' : 'Non-Quitable'}`,
              is_active: true
            });

            configs.push(config);
            createdCount++;

            // Log progress every 20 configs
            if (createdCount % 20 === 0) {
              console.log(`  Created ${createdCount} configs...`);
            }
          }
        }
      }
    }

    if (configs.length > 0) {
      console.log(`\n💾 Saving ${configs.length} pricing configurations...`);
      await pricingRepo.save(configs);
      console.log(`✅ Successfully created ${createdCount} pricing configurations!`);
    }

    if (skippedCount > 0) {
      console.log(`⏭️  Skipped ${skippedCount} existing configurations`);
    }

    const totalCombinations = PLACEMENT_AREAS.length * AD_TYPES.length * TIME_UNITS.length * QUITABLE_OPTIONS.length;
    console.log(`\n📊 Summary:`);
    console.log(`   Total possible combinations: ${totalCombinations}`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Skipped (already exist): ${skippedCount}`);
    console.log(`   Total in database: ${createdCount + skippedCount}`);

  } catch (error) {
    console.error('❌ Error creating pricing configs:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

createAllPricingConfigs()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

