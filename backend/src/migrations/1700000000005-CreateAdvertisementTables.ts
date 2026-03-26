import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAdvertisementTables1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist
    const videoAdsExists = await queryRunner.hasTable('video_advertisements');
    const areaConfigsExists = await queryRunner.hasTable('advertisement_area_configs');
    const doctorsExists = await queryRunner.hasTable('doctors');

    // Create video_advertisements table
    if (!videoAdsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'video_advertisements',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'doctor_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'title',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'type',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'video_url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'thumbnail_url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'image_url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'duration_seconds',
              type: 'integer',
              isNullable: false,
              default: 5,
            },
            {
              name: 'video_format',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'file_size_mb',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'content',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'target_url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'button_text',
              type: 'varchar',
              length: '100',
              isNullable: true,
            },
            {
              name: 'button_color',
              type: 'varchar',
              length: '7',
              isNullable: true,
            },
            {
              name: 'background_color',
              type: 'varchar',
              length: '7',
              isNullable: true,
            },
            {
              name: 'text_color',
              type: 'varchar',
              length: '7',
              isNullable: true,
            },
            {
              name: 'selected_area',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'additional_areas',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'hourly_rate',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'duration_type',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'duration_value',
              type: 'integer',
              isNullable: false,
            },
            {
              name: 'total_cost',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'paid_amount',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
              default: 0,
            },
            {
              name: 'start_date',
              type: 'timestamp',
              isNullable: false,
            },
            {
              name: 'end_date',
              type: 'timestamp',
              isNullable: false,
            },
            {
              name: 'start_time',
              type: 'time',
              isNullable: true,
            },
            {
              name: 'end_time',
              type: 'time',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'varchar',
              isNullable: false,
              default: "'pending'",
            },
            {
              name: 'admin_notes',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'rejection_reason',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              isNullable: false,
              default: true,
            },
            {
              name: 'impressions',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'clicks',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'views',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'ctr',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
              default: 0,
            },
            {
              name: 'cpm',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
              default: 0,
            },
            {
              name: 'payment_method',
              type: 'varchar',
              length: '100',
              isNullable: true,
            },
            {
              name: 'payment_status',
              type: 'varchar',
              length: '100',
              isNullable: true,
            },
            {
              name: 'payment_date',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'transaction_id',
              type: 'varchar',
              length: '200',
              isNullable: true,
            },
            {
              name: 'priority',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'targeting',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'schedule',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              isNullable: false,
              default: 'now()',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              isNullable: false,
              default: 'now()',
            },
          ],
        }),
        true
      );

      // Create indexes
      await queryRunner.createIndex(
        'video_advertisements',
        new TableIndex({
          name: 'IDX_video_advertisements_doctor_id',
          columnNames: ['doctor_id'],
        })
      );

      await queryRunner.createIndex(
        'video_advertisements',
        new TableIndex({
          name: 'IDX_video_advertisements_status',
          columnNames: ['status'],
        })
      );

      await queryRunner.createIndex(
        'video_advertisements',
        new TableIndex({
          name: 'IDX_video_advertisements_selected_area',
          columnNames: ['selected_area'],
        })
      );

      await queryRunner.createIndex(
        'video_advertisements',
        new TableIndex({
          name: 'IDX_video_advertisements_start_date',
          columnNames: ['start_date'],
        })
      );

      await queryRunner.createIndex(
        'video_advertisements',
        new TableIndex({
          name: 'IDX_video_advertisements_end_date',
          columnNames: ['end_date'],
        })
      );

      await queryRunner.createIndex(
        'video_advertisements',
        new TableIndex({
          name: 'IDX_video_advertisements_is_active',
          columnNames: ['is_active'],
        })
      );

      // Add foreign key if doctors table exists
      if (doctorsExists) {
        await queryRunner.createForeignKey(
          'video_advertisements',
          new TableForeignKey({
            columnNames: ['doctor_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'doctors',
            onDelete: 'CASCADE',
            name: 'FK_video_advertisements_doctor_id',
          })
        );
      }
    }

    // Create advertisement_area_configs table
    if (!areaConfigsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'advertisement_area_configs',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'area_name',
              type: 'varchar',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'display_name',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'device_type',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'position',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'dimensions',
              type: 'json',
              isNullable: false,
            },
            {
              name: 'responsive_breakpoints',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'styles',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'base_hourly_rate',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'pricing_tiers',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'max_concurrent_ads',
              type: 'integer',
              isNullable: false,
              default: 1,
            },
            {
              name: 'current_active_ads',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'total_ads_served',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'allowed_content_types',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'max_file_size_mb',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'max_duration_seconds',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'allowed_formats',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'visible_to_guests',
              type: 'boolean',
              isNullable: false,
              default: true,
            },
            {
              name: 'visible_to_authenticated',
              type: 'boolean',
              isNullable: false,
              default: true,
            },
            {
              name: 'allow_user_selection',
              type: 'boolean',
              isNullable: false,
              default: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              isNullable: false,
              default: true,
            },
            {
              name: 'priority',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'admin_notes',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'average_ctr',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
              default: 0,
            },
            {
              name: 'average_cpm',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
              default: 0,
            },
            {
              name: 'total_impressions',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'total_clicks',
              type: 'integer',
              isNullable: false,
              default: 0,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              isNullable: false,
              default: 'now()',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              isNullable: false,
              default: 'now()',
            },
          ],
        }),
        true
      );

      // Create indexes
      await queryRunner.createIndex(
        'advertisement_area_configs',
        new TableIndex({
          name: 'IDX_advertisement_area_configs_area_name',
          columnNames: ['area_name'],
        })
      );

      await queryRunner.createIndex(
        'advertisement_area_configs',
        new TableIndex({
          name: 'IDX_advertisement_area_configs_device_type',
          columnNames: ['device_type'],
        })
      );

      await queryRunner.createIndex(
        'advertisement_area_configs',
        new TableIndex({
          name: 'IDX_advertisement_area_configs_is_active',
          columnNames: ['is_active'],
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables if they exist
    const videoAdsExists = await queryRunner.hasTable('video_advertisements');
    const areaConfigsExists = await queryRunner.hasTable('advertisement_area_configs');

    if (videoAdsExists) {
      await queryRunner.dropTable('video_advertisements');
    }

    if (areaConfigsExists) {
      await queryRunner.dropTable('advertisement_area_configs');
    }
  }
}

