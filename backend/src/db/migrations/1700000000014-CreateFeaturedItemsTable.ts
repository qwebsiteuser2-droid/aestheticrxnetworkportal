import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFeaturedItemsTable1700000000014 implements MigrationInterface {
  name = 'CreateFeaturedItemsTable1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create featured_items table
    const tableExists = await queryRunner.hasTable('featured_items');
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'featured_items',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'item_type',
              type: 'varchar',
              length: '20',
              isNullable: false,
            },
            {
              name: 'item_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'display_order',
              type: 'integer',
              default: 0,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true
      );

      // Add index for item_type and display_order
      await queryRunner.createIndex('featured_items', new TableIndex({
        name: 'IDX_featured_items_type_order',
        columnNames: ['item_type', 'display_order'],
      }));

      console.log('✅ Created featured_items table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('featured_items', true, true, true);
    console.log('✅ Dropped featured_items table');
  }
}

