import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAdvertisementAreaPreviewAndRotation1700000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if advertisement_area_configs table exists before trying to modify it
    const tableExists = await queryRunner.hasTable('advertisement_area_configs');
    
    if (!tableExists) {
      // Table doesn't exist yet - skip this migration
      return;
    }

    // Check if columns already exist before adding them
    const hasPreviewImageUrl = await queryRunner.hasColumn('advertisement_area_configs', 'preview_image_url');
    const hasRotationInterval = await queryRunner.hasColumn('advertisement_area_configs', 'rotation_interval_seconds');
    const hasAutoRotation = await queryRunner.hasColumn('advertisement_area_configs', 'auto_rotation_enabled');

    // Add preview_image_url column
    if (!hasPreviewImageUrl) {
      await queryRunner.addColumn('advertisement_area_configs', new TableColumn({
        name: 'preview_image_url',
        type: 'text',
        isNullable: true,
      }));
    }

    // Add rotation_interval_seconds column
    if (!hasRotationInterval) {
      await queryRunner.addColumn('advertisement_area_configs', new TableColumn({
        name: 'rotation_interval_seconds',
        type: 'int',
        default: 5,
      }));
    }

    // Add auto_rotation_enabled column
    if (!hasAutoRotation) {
      await queryRunner.addColumn('advertisement_area_configs', new TableColumn({
        name: 'auto_rotation_enabled',
        type: 'boolean',
        default: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('advertisement_area_configs', 'auto_rotation_enabled');
    await queryRunner.dropColumn('advertisement_area_configs', 'rotation_interval_seconds');
    await queryRunner.dropColumn('advertisement_area_configs', 'preview_image_url');
  }
}

