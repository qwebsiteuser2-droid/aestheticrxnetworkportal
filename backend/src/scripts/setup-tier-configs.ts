import { AppDataSource } from '../db/data-source';
import { TierConfig } from '../models/TierConfig';

async function setupTierConfigs() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Check if tier configs already exist
    const existingTiers = await tierRepository.find();
    if (existingTiers.length > 0) {
      console.log('📊 Tier configurations already exist, skipping...');
      return;
    }

    // Default tier configurations
    const defaultTiers = [
      {
        name: 'Lead Starter',
        threshold: 0,
        color: 'gray',
        description: '0 – 99,999 PKR',
        benefits: 'Listed in system only.',
        icon: '⚪',
        display_order: 1,
        is_active: true
      },
      {
        name: 'Lead Contributor',
        threshold: 100000,
        color: 'green',
        description: '100,000 – 249,999 PKR',
        benefits: 'Name on leaderboard, basic badge.',
        icon: '🟢',
        display_order: 2,
        is_active: true
      },
      {
        name: 'Lead Expert',
        threshold: 250000,
        color: 'blue',
        description: '250,000 – 499,999 PKR',
        benefits: '5% discount + small gift pack.',
        icon: '🔵',
        display_order: 3,
        is_active: true
      },
      {
        name: 'Grand Lead',
        threshold: 500000,
        color: 'purple',
        description: '500,000 – 999,999 PKR',
        benefits: '10% discount + priority support + VIP badge.',
        icon: '🟣',
        display_order: 4,
        is_active: true
      },
      {
        name: 'Elite Lead',
        threshold: 1000000,
        color: 'red',
        description: '1,000,000+ PKR',
        benefits: '15% discount + free marketing ads (admin chooses), premium badge, homepage feature.',
        icon: '🔴',
        display_order: 5,
        is_active: true
      }
    ];

    // Create tier configurations
    const tierConfigs = tierRepository.create(defaultTiers);
    await tierRepository.save(tierConfigs);

    console.log('✅ Tier configurations created successfully');
    console.log('📊 Created tiers:', defaultTiers.map(t => t.name).join(', '));

  } catch (error: unknown) {
    console.error('❌ Error setting up tier configurations:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

setupTierConfigs();
