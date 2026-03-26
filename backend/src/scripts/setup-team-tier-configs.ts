import { AppDataSource } from '../db/data-source';
import { TeamTierConfig } from '../entities/TeamTierConfig';

async function setupTeamTierConfigs() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const teamTierRepository = AppDataSource.getRepository(TeamTierConfig);

    // Check if team tier configs already exist
    const existingTiers = await teamTierRepository.find();
    if (existingTiers.length > 0) {
      console.log('📊 Team tier configurations already exist, skipping...');
      return;
    }

    // Default team tier configurations (based on individual tiers)
    const defaultTeamTiers = [
      {
        name: 'Team Starter',
        description: '0 – 199,999 PKR (2 members) / 0 – 299,999 PKR (3 members)',
        benefits: 'Listed in system only. Team collaboration features.',
        icon: '⚪',
        color: 'gray',
        individual_threshold: 100000, // Base amount per individual
        max_members: 3,
        discount_2_members: 5.00, // 5% discount for 2-member teams
        discount_3_members: 10.00, // 10% discount for 3-member teams
        discount_4_members: 15.00, // 15% discount for 4+ member teams
        display_order: 1,
        is_active: true
      },
      {
        name: 'Team Contributor',
        description: '200,000 – 499,999 PKR (2 members) / 300,000 – 749,999 PKR (3 members)',
        benefits: 'Team name on leaderboard, basic team badge, 5% discount (2 members) / 10% discount (3 members).',
        icon: '🟢',
        color: 'green',
        individual_threshold: 250000,
        max_members: 3,
        discount_2_members: 5.00,
        discount_3_members: 10.00,
        discount_4_members: 15.00,
        display_order: 2,
        is_active: true
      },
      {
        name: 'Team Expert',
        description: '500,000 – 999,999 PKR (2 members) / 750,000 – 1,499,999 PKR (3 members)',
        benefits: '5% discount (2 members) / 10% discount (3 members) + team gift pack + priority support.',
        icon: '🔵',
        color: 'blue',
        individual_threshold: 500000,
        max_members: 3,
        discount_2_members: 5.00,
        discount_3_members: 10.00,
        discount_4_members: 15.00,
        display_order: 3,
        is_active: true
      },
      {
        name: 'Team Grand Lead',
        description: '1,000,000 – 1,999,999 PKR (2 members) / 1,500,000 – 2,999,999 PKR (3 members)',
        benefits: '5% discount (2 members) / 10% discount (3 members) + VIP team badge + priority support + team marketing features.',
        icon: '🟣',
        color: 'purple',
        individual_threshold: 1000000,
        max_members: 3,
        discount_2_members: 5.00,
        discount_3_members: 10.00,
        discount_4_members: 15.00,
        display_order: 4,
        is_active: true
      },
      {
        name: 'Team Elite',
        description: '2,000,000+ PKR (2 members) / 3,000,000+ PKR (3 members)',
        benefits: '5% discount (2 members) / 10% discount (3 members) + premium team badge + homepage feature + free team marketing ads + exclusive team benefits.',
        icon: '🔴',
        color: 'red',
        individual_threshold: 2000000,
        max_members: 3,
        discount_2_members: 5.00,
        discount_3_members: 10.00,
        discount_4_members: 15.00,
        display_order: 5,
        is_active: true
      }
    ];

    // Create team tier configurations
    const teamTierConfigs = teamTierRepository.create(defaultTeamTiers);
    const savedTiers = await teamTierRepository.save(teamTierConfigs);

    console.log('✅ Team tier configurations created successfully:');
    savedTiers.forEach(tier => {
      console.log(`   - ${tier.name}: ${tier.individual_threshold} PKR base threshold`);
    });

    console.log('\n📊 Team Tier Pricing Examples:');
    console.log('Individual threshold: 100,000 PKR');
    console.log('2-member team: 200,000 PKR total → 5% discount → 190,000 PKR final');
    console.log('3-member team: 300,000 PKR total → 10% discount → 270,000 PKR final');
    console.log('\nIndividual threshold: 250,000 PKR');
    console.log('2-member team: 500,000 PKR total → 5% discount → 475,000 PKR final');
    console.log('3-member team: 750,000 PKR total → 10% discount → 675,000 PKR final');

  } catch (error: unknown) {
    console.error('❌ Error setting up team tier configurations:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

setupTeamTierConfigs();
