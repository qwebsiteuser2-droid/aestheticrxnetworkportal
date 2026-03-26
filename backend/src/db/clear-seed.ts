import { clearSeedData } from './seed';

/**
 * Clear all seed data from the database
 */
const main = async (): Promise<void> => {
  try {
    await clearSeedData();
    console.log('🎉 Seed data cleared successfully!');
    process.exit(0);
  } catch (error: unknown) {
    console.error('💥 Failed to clear seed data:', error);
    process.exit(1);
  }
};

main();
