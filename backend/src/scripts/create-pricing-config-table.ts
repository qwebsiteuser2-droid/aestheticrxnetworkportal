import { AppDataSource } from '../db/data-source';
import { QueryRunner } from 'typeorm';

async function createPricingConfigTable() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if table exists
      const tableExists = await queryRunner.hasTable('advertisement_pricing_configs');
      
      if (tableExists) {
        console.log('✅ Table advertisement_pricing_configs already exists');
        await queryRunner.commitTransaction();
        return;
      }

      console.log('📝 Creating advertisement_pricing_configs table...');

      await queryRunner.query(`
        CREATE TABLE advertisement_pricing_configs (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          placement_area varchar(100) NOT NULL,
          advertisement_type varchar(50) NOT NULL,
          duration_unit varchar(20) NOT NULL,
          is_quitable boolean NOT NULL DEFAULT true,
          unit_price decimal(10, 2) NOT NULL,
          is_active boolean NOT NULL DEFAULT true,
          description text,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);

      // Create unique index
      await queryRunner.query(`
        CREATE UNIQUE INDEX IDX_unique_pricing_config 
        ON advertisement_pricing_configs (placement_area, advertisement_type, duration_unit, is_quitable)
      `);

      // Create lookup index
      await queryRunner.query(`
        CREATE INDEX IDX_pricing_config_lookup 
        ON advertisement_pricing_configs (placement_area, advertisement_type, duration_unit, is_quitable, is_active)
      `);

      await queryRunner.commitTransaction();
      console.log('✅ Table advertisement_pricing_configs created successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

createPricingConfigTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

