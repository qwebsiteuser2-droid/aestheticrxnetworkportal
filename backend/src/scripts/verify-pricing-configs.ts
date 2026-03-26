import { AppDataSource } from '../db/data-source';
import { AdvertisementPricingConfig } from '../models/AdvertisementPricingConfig';

async function verifyPricingConfigs() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const pricingRepo = AppDataSource.getRepository(AdvertisementPricingConfig);

    const allConfigs = await pricingRepo.find({
      order: {
        placement_area: 'ASC',
        advertisement_type: 'ASC',
        duration_unit: 'ASC',
        is_quitable: 'ASC'
      }
    });

    console.log(`📊 Total Pricing Configurations: ${allConfigs.length}\n`);

    // Group by placement
    const byPlacement: { [key: string]: number } = {};
    const byAdType: { [key: string]: number } = {};
    const byTimeUnit: { [key: string]: number } = {};
    const byQuitable: { [key: string]: number } = {};

    allConfigs.forEach(config => {
      byPlacement[config.placement_area] = (byPlacement[config.placement_area] || 0) + 1;
      byAdType[config.advertisement_type] = (byAdType[config.advertisement_type] || 0) + 1;
      byTimeUnit[config.duration_unit] = (byTimeUnit[config.duration_unit] || 0) + 1;
      byQuitable[config.is_quitable ? 'Quitable' : 'Non-Quitable'] = (byQuitable[config.is_quitable ? 'Quitable' : 'Non-Quitable'] || 0) + 1;
    });

    console.log('📋 Breakdown by Placement:');
    Object.entries(byPlacement).forEach(([placement, count]) => {
      console.log(`   ${placement.replace(/_/g, ' ')}: ${count} configs`);
    });

    console.log('\n📋 Breakdown by Ad Type:');
    Object.entries(byAdType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} configs`);
    });

    console.log('\n📋 Breakdown by Time Unit:');
    Object.entries(byTimeUnit).forEach(([unit, count]) => {
      console.log(`   ${unit}: ${count} configs`);
    });

    console.log('\n📋 Breakdown by Quitable:');
    Object.entries(byQuitable).forEach(([quitable, count]) => {
      console.log(`   ${quitable}: ${count} configs`);
    });

    // Show sample configs
    console.log('\n📝 Sample Configurations (first 10):');
    allConfigs.slice(0, 10).forEach((config, index) => {
      console.log(`\n   ${index + 1}. ${config.placement_area.replace(/_/g, ' ')}`);
      console.log(`      Type: ${config.advertisement_type} | Unit: ${config.duration_unit} | Quitable: ${config.is_quitable ? 'Yes' : 'No'}`);
      console.log(`      Price: PKR ${parseFloat(config.unit_price).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`      Status: ${config.is_active ? 'Active' : 'Inactive'}`);
    });

    const activeCount = allConfigs.filter(c => c.is_active).length;
    console.log(`\n✅ Active Configurations: ${activeCount}`);
    console.log(`✅ All ${allConfigs.length} configurations are ready to use!`);

  } catch (error) {
    console.error('❌ Error verifying pricing configs:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

verifyPricingConfigs()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

