import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAreaDisplayType1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if advertisement_area_configs table exists before trying to modify it
    const tableExists = await queryRunner.hasTable('advertisement_area_configs');
    
    if (!tableExists) {
      // Table doesn't exist yet - skip this migration
      return;
    }

    // Check if column already exists before adding it
    const hasDisplayType = await queryRunner.hasColumn('advertisement_area_configs', 'display_type');

    // Add display_type field to specify if area should show slides or simple ads
    if (!hasDisplayType) {
      await queryRunner.addColumn('advertisement_area_configs', new TableColumn({
        name: 'display_type',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'simple'",
        comment: 'Display type: "slides" for carousel/slideshow, "simple" for single ad display'
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('advertisement_area_configs', 'display_type');
  }
}

