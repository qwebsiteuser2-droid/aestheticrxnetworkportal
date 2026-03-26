import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAdvertisementPricingConfigs1700000000020 implements MigrationInterface {
  name = 'CreateAdvertisementPricingConfigs1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'advertisement_pricing_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'placement_area',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'advertisement_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'duration_unit',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'is_quitable',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'unit_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create unique index to prevent duplicate configurations
    await queryRunner.createIndex(
      'advertisement_pricing_configs',
      new TableIndex({
        name: 'IDX_unique_pricing_config',
        columnNames: ['placement_area', 'advertisement_type', 'duration_unit', 'is_quitable'],
        isUnique: true,
      })
    );

    // Create index for faster lookups
    await queryRunner.createIndex(
      'advertisement_pricing_configs',
      new TableIndex({
        name: 'IDX_pricing_config_lookup',
        columnNames: ['placement_area', 'advertisement_type', 'duration_unit', 'is_quitable', 'is_active'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('advertisement_pricing_configs', 'IDX_pricing_config_lookup');
    await queryRunner.dropIndex('advertisement_pricing_configs', 'IDX_unique_pricing_config');
    await queryRunner.dropTable('advertisement_pricing_configs');
  }
}

