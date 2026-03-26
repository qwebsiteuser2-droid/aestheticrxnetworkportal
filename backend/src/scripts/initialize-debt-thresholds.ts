import { AppDataSource } from '../db/data-source';
import { DebtThreshold } from '../models/DebtThreshold';

async function initializeDebtThresholds() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const debtThresholdRepository = AppDataSource.getRepository(DebtThreshold);

    // Check if debt thresholds already exist
    const existingThresholds = await debtThresholdRepository.find();
    if (existingThresholds.length > 0) {
      console.log('📊 Debt thresholds already exist, skipping...');
      return;
    }

    // Default debt limits for each tier (based on existing tier system)
    const defaultThresholds = [
      { 
        tier_name: 'Lead Starter', 
        debt_limit: 50000, 
        description: 'Lead Starter tier debt limit (0-99,999 PKR tier)',
        is_active: true
      },
      { 
        tier_name: 'Lead Contributor', 
        debt_limit: 100000, 
        description: 'Lead Contributor tier debt limit (100,000-249,999 PKR tier)',
        is_active: true
      },
      { 
        tier_name: 'Lead Expert', 
        debt_limit: 200000, 
        description: 'Lead Expert tier debt limit (250,000-499,999 PKR tier)',
        is_active: true
      },
      { 
        tier_name: 'Grand Lead', 
        debt_limit: 400000, 
        description: 'Grand Lead tier debt limit (500,000-999,999 PKR tier)',
        is_active: true
      },
      { 
        tier_name: 'Elite Lead', 
        debt_limit: 800000, 
        description: 'Elite Lead tier debt limit (1,000,000+ PKR tier)',
        is_active: true
      }
    ];

    // Create debt threshold configurations
    const debtThresholds = debtThresholdRepository.create(defaultThresholds);
    await debtThresholdRepository.save(debtThresholds);

    console.log('✅ Debt thresholds initialized successfully');
    console.log('📊 Created debt thresholds for tiers:');
    defaultThresholds.forEach(threshold => {
      console.log(`   - ${threshold.tier_name}: $${threshold.debt_limit.toLocaleString()}`);
    });

  } catch (error: unknown) {
    console.error('❌ Error initializing debt thresholds:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the initialization
initializeDebtThresholds();
