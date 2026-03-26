import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAreaCloseableSetting1700000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if advertisement_area_configs table exists before trying to modify it
    const tableExists = await queryRunner.hasTable('advertisement_area_configs');
    
    if (!tableExists) {
      // Table doesn't exist yet - skip this migration
      return;
    }

    // Check if column already exists before adding it
    const hasAdsCloseable = await queryRunner.hasColumn('advertisement_area_configs', 'ads_closeable');

    // Add ads_closeable field to control if ads in this area can be closed by users
    if (!hasAdsCloseable) {
    await queryRunner.addColumn('advertisement_area_configs', new TableColumn({
      name: 'ads_closeable',
      type: 'boolean',
      isNullable: true,
      default: true,
      comment: 'Whether advertisements in this area can be closed/dismissed by users'
    }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('advertisement_area_configs', 'ads_closeable');
  }
}
