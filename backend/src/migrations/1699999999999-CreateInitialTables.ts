import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateInitialTables1699999999999 implements MigrationInterface {
  name = 'CreateInitialTables1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Check if doctors table already exists
    const doctorsTableExists = await queryRunner.hasTable('doctors');
    if (!doctorsTableExists) {
      // Create doctors table
      await queryRunner.createTable(
        new Table({
          name: 'doctors',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'doctor_id',
              type: 'integer',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'password_hash',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'clinic_name',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'doctor_name',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'whatsapp',
              type: 'varchar',
              length: '20',
              isNullable: true,
            },
            {
              name: 'google_location',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'signup_id',
              type: 'varchar',
              length: '50',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'is_approved',
              type: 'boolean',
              default: false,
            },
            {
              name: 'is_admin',
              type: 'boolean',
              default: false,
            },
            {
              name: 'is_deactivated',
              type: 'boolean',
              default: false,
            },
            {
              name: 'user_type',
              type: 'varchar',
              length: '50',
              default: "'doctor'",
            },
            {
              name: 'display_name',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'bio',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'tags',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'tier',
              type: 'varchar',
              length: '50',
              default: "'Lead Starter'",
            },
            {
              name: 'tier_color',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'base_tier',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'tier_progress',
              type: 'decimal',
              precision: 10,
              scale: 2,
              default: 0,
            },
            {
              name: 'current_sales',
              type: 'decimal',
              precision: 10,
              scale: 2,
              default: 0,
            },
            {
              name: 'email_unsubscribed',
              type: 'boolean',
              default: false,
            },
            {
              name: 'email_unsubscribed_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'profile_photo_url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'consent_flag',
              type: 'boolean',
              default: false,
            },
            {
              name: 'consent_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'approved_at',
              type: 'timestamp',
              isNullable: true,
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

      // Create indexes for doctors table
      await queryRunner.createIndex('doctors', new TableIndex({ columnNames: ['email'] }));
      await queryRunner.createIndex('doctors', new TableIndex({ columnNames: ['doctor_id'] }));
      await queryRunner.createIndex('doctors', new TableIndex({ columnNames: ['signup_id'] }));
      await queryRunner.createIndex('doctors', new TableIndex({ columnNames: ['is_approved'] }));
      await queryRunner.createIndex('doctors', new TableIndex({ columnNames: ['is_admin'] }));
    }

    // Check if products table already exists
    const productsTableExists = await queryRunner.hasTable('products');
    if (!productsTableExists) {
      // Create products table
      await queryRunner.createTable(
        new Table({
          name: 'products',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'slot_index',
              type: 'integer',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'image_url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'name',
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
              name: 'price',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: true,
            },
            {
              name: 'is_visible',
              type: 'boolean',
              default: true,
            },
            {
              name: 'category',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'unit',
              type: 'varchar',
              length: '20',
              isNullable: true,
            },
            {
              name: 'stock_quantity',
              type: 'integer',
              default: 0,
            },
            {
              name: 'is_featured',
              type: 'boolean',
              default: false,
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

      // Add check constraint for slot_index
      await queryRunner.query(`
        ALTER TABLE "products" 
        ADD CONSTRAINT "CHK_products_slot_index" 
        CHECK (slot_index >= 1 AND slot_index <= 100)
      `);

      // Create indexes for products table
      await queryRunner.createIndex('products', new TableIndex({ columnNames: ['slot_index'] }));
      await queryRunner.createIndex('products', new TableIndex({ columnNames: ['is_visible'] }));
      await queryRunner.createIndex('products', new TableIndex({ columnNames: ['is_featured'] }));
      await queryRunner.createIndex('products', new TableIndex({ columnNames: ['category'] }));
    }

    // Check if orders table already exists
    const ordersTableExists = await queryRunner.hasTable('orders');
    if (!ordersTableExists) {
      // Create orders table
      await queryRunner.createTable(
        new Table({
          name: 'orders',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'order_number',
              type: 'varchar',
              length: '50',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'doctor_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'product_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'qty',
              type: 'integer',
              isNullable: false,
            },
            {
              name: 'order_location',
              type: 'jsonb',
              isNullable: false,
            },
            {
              name: 'order_total',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '20',
              default: "'pending'",
            },
            {
              name: 'notes',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'accepted_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'completed_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'cancelled_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'cancelled_reason',
              type: 'varchar',
              length: '255',
              isNullable: true,
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

      // Add foreign keys
      await queryRunner.createForeignKey(
        'orders',
        new TableForeignKey({
          columnNames: ['doctor_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'doctors',
          onDelete: 'CASCADE',
        })
      );

      await queryRunner.createForeignKey(
        'orders',
        new TableForeignKey({
          columnNames: ['product_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'products',
          onDelete: 'CASCADE',
        })
      );

      // Add check constraints
      await queryRunner.query(`
        ALTER TABLE "orders" 
        ADD CONSTRAINT "CHK_orders_qty" 
        CHECK (qty > 0)
      `);

      await queryRunner.query(`
        ALTER TABLE "orders" 
        ADD CONSTRAINT "CHK_orders_status" 
        CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled'))
      `);

      // Create indexes for orders table
      await queryRunner.createIndex('orders', new TableIndex({ columnNames: ['order_number'] }));
      await queryRunner.createIndex('orders', new TableIndex({ columnNames: ['doctor_id'] }));
      await queryRunner.createIndex('orders', new TableIndex({ columnNames: ['product_id'] }));
      await queryRunner.createIndex('orders', new TableIndex({ columnNames: ['status'] }));
      await queryRunner.createIndex('orders', new TableIndex({ columnNames: ['created_at'] }));
    }

    // Create other tables (research_papers, notifications, etc.)
    const researchPapersTableExists = await queryRunner.hasTable('research_papers');
    if (!researchPapersTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'research_papers',
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
              name: 'abstract',
              type: 'text',
              isNullable: false,
            },
            {
              name: 'content',
              type: 'text',
              isNullable: false,
            },
            {
              name: 'citations',
              type: 'jsonb',
              default: "'[]'",
            },
            {
              name: 'image_urls',
              type: 'varchar',
              isArray: true,
              default: "'{}'",
            },
            {
              name: 'tags',
              type: 'varchar',
              isArray: true,
              default: "'{}'",
            },
            {
              name: 'is_approved',
              type: 'boolean',
              default: false,
            },
            {
              name: 'view_count',
              type: 'integer',
              default: 0,
            },
            {
              name: 'upvote_count',
              type: 'integer',
              default: 0,
            },
            {
              name: 'approved_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'approved_by',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'rejection_reason',
              type: 'text',
              isNullable: true,
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

      await queryRunner.createForeignKey(
        'research_papers',
        new TableForeignKey({
          columnNames: ['doctor_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'doctors',
          onDelete: 'CASCADE',
        })
      );

      await queryRunner.createForeignKey(
        'research_papers',
        new TableForeignKey({
          columnNames: ['approved_by'],
          referencedColumnNames: ['id'],
          referencedTableName: 'doctors',
          onDelete: 'SET NULL',
        })
      );

      await queryRunner.createIndex('research_papers', new TableIndex({ columnNames: ['doctor_id'] }));
      await queryRunner.createIndex('research_papers', new TableIndex({ columnNames: ['is_approved'] }));
      await queryRunner.createIndex('research_papers', new TableIndex({ columnNames: ['created_at'] }));
      await queryRunner.createIndex('research_papers', new TableIndex({ columnNames: ['view_count'] }));
      await queryRunner.createIndex('research_papers', new TableIndex({ columnNames: ['upvote_count'] }));
    }

    const notificationsTableExists = await queryRunner.hasTable('notifications');
    if (!notificationsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'notifications',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'recipient_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'type',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'payload',
              type: 'jsonb',
              isNullable: false,
            },
            {
              name: 'is_sent',
              type: 'boolean',
              default: false,
            },
            {
              name: 'is_read',
              type: 'boolean',
              default: false,
            },
            {
              name: 'email_sent',
              type: 'boolean',
              default: false,
            },
            {
              name: 'whatsapp_sent',
              type: 'boolean',
              default: false,
            },
            {
              name: 'sent_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'error_message',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'retry_count',
              type: 'integer',
              default: 0,
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

      await queryRunner.createForeignKey(
        'notifications',
        new TableForeignKey({
          columnNames: ['recipient_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'doctors',
          onDelete: 'CASCADE',
        })
      );

      // Note: Removed CHECK constraint for type column - using VARCHAR allows flexibility
      // for adding new notification types without database migrations

      await queryRunner.createIndex('notifications', new TableIndex({ columnNames: ['recipient_id'] }));
      await queryRunner.createIndex('notifications', new TableIndex({ columnNames: ['type'] }));
      await queryRunner.createIndex('notifications', new TableIndex({ columnNames: ['is_sent'] }));
      await queryRunner.createIndex('notifications', new TableIndex({ columnNames: ['created_at'] }));
    }

    const leaderboardSnapshotsTableExists = await queryRunner.hasTable('leaderboard_snapshots');
    if (!leaderboardSnapshotsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'leaderboard_snapshots',
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
              name: 'snapshot_date',
              type: 'date',
              isNullable: false,
            },
            {
              name: 'tier',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'current_sales',
              type: 'decimal',
              precision: 12,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'rank',
              type: 'integer',
              isNullable: false,
            },
            {
              name: 'total_doctors',
              type: 'integer',
              isNullable: false,
            },
            {
              name: 'previous_sales',
              type: 'decimal',
              precision: 12,
              scale: 2,
              isNullable: true,
            },
            {
              name: 'previous_tier',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'previous_rank',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true
      );

      await queryRunner.createForeignKey(
        'leaderboard_snapshots',
        new TableForeignKey({
          columnNames: ['doctor_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'doctors',
          onDelete: 'CASCADE',
        })
      );

      await queryRunner.createIndex('leaderboard_snapshots', new TableIndex({ columnNames: ['doctor_id'] }));
      await queryRunner.createIndex('leaderboard_snapshots', new TableIndex({ columnNames: ['snapshot_date'] }));
      await queryRunner.createIndex('leaderboard_snapshots', new TableIndex({ columnNames: ['tier'] }));
      await queryRunner.createIndex('leaderboard_snapshots', new TableIndex({ columnNames: ['rank'] }));
    }

    const allowedSignupIdsTableExists = await queryRunner.hasTable('allowed_signup_ids');
    if (!allowedSignupIdsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'allowed_signup_ids',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'signup_id',
              type: 'varchar',
              length: '50',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'is_used',
              type: 'boolean',
              default: false,
            },
            {
              name: 'used_by_email',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'used_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'notes',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true
      );

      await queryRunner.createIndex('allowed_signup_ids', new TableIndex({ columnNames: ['signup_id'] }));
      await queryRunner.createIndex('allowed_signup_ids', new TableIndex({ columnNames: ['is_used'] }));
    }

    const hallOfPrideTableExists = await queryRunner.hasTable('hall_of_pride');
    if (!hallOfPrideTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'hall_of_pride',
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
              isNullable: false,
            },
            {
              name: 'image_url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'achievement_type',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'reason',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
            },
            {
              name: 'display_order',
              type: 'integer',
              default: 0,
            },
            {
              name: 'created_by_admin',
              type: 'uuid',
              isNullable: true,
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

      await queryRunner.createForeignKey(
        'hall_of_pride',
        new TableForeignKey({
          columnNames: ['doctor_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'doctors',
          onDelete: 'CASCADE',
        })
      );

      await queryRunner.createForeignKey(
        'hall_of_pride',
        new TableForeignKey({
          columnNames: ['created_by_admin'],
          referencedColumnNames: ['id'],
          referencedTableName: 'doctors',
          onDelete: 'SET NULL',
        })
      );

      await queryRunner.createIndex('hall_of_pride', new TableIndex({ columnNames: ['doctor_id'] }));
      await queryRunner.createIndex('hall_of_pride', new TableIndex({ columnNames: ['is_active'] }));
      await queryRunner.createIndex('hall_of_pride', new TableIndex({ columnNames: ['display_order'] }));
      await queryRunner.createIndex('hall_of_pride', new TableIndex({ columnNames: ['created_at'] }));
    }

    // Create functions and triggers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at (only if tables exist)
    if (doctorsTableExists === false) {
      await queryRunner.query(`
        CREATE TRIGGER update_doctors_updated_at 
        BEFORE UPDATE ON doctors 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    if (productsTableExists === false) {
      await queryRunner.query(`
        CREATE TRIGGER update_products_updated_at 
        BEFORE UPDATE ON products 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    if (ordersTableExists === false) {
      await queryRunner.query(`
        CREATE TRIGGER update_orders_updated_at 
        BEFORE UPDATE ON orders 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    if (researchPapersTableExists === false) {
      await queryRunner.query(`
        CREATE TRIGGER update_research_papers_updated_at 
        BEFORE UPDATE ON research_papers 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    if (notificationsTableExists === false) {
      await queryRunner.query(`
        CREATE TRIGGER update_notifications_updated_at 
        BEFORE UPDATE ON notifications 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    if (hallOfPrideTableExists === false) {
      await queryRunner.query(`
        CREATE TRIGGER update_hall_of_pride_updated_at 
        BEFORE UPDATE ON hall_of_pride 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    // Create sequence for doctor_id starting from 42001
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS doctor_id_seq START 42001;
    `);

    // Create function to auto-generate doctor_id
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generate_doctor_id()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.doctor_id IS NULL THEN
              NEW.doctor_id = nextval('doctor_id_seq');
          END IF;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for auto-generating doctor_id (only if doctors table was just created)
    if (doctorsTableExists === false) {
      await queryRunner.query(`
        CREATE TRIGGER generate_doctor_id_trigger 
        BEFORE INSERT ON doctors 
        FOR EACH ROW 
        EXECUTE FUNCTION generate_doctor_id();
      `);
    }

    // Create sequence for order numbers
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
    `);

    // Create function to generate order numbers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generate_order_number()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.order_number IS NULL THEN
              NEW.order_number = 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
          END IF;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for auto-generating order numbers (only if orders table was just created)
    if (ordersTableExists === false) {
      await queryRunner.query(`
        CREATE TRIGGER generate_order_number_trigger 
        BEFORE INSERT ON orders 
        FOR EACH ROW 
        EXECUTE FUNCTION generate_order_number();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS generate_doctor_id_trigger ON doctors;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_hall_of_pride_updated_at ON hall_of_pride;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_research_papers_updated_at ON research_papers;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_products_updated_at ON products;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors;`);

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS generate_order_number();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS generate_doctor_id();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column();`);

    // Drop sequences
    await queryRunner.query(`DROP SEQUENCE IF EXISTS order_number_seq;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS doctor_id_seq;`);

    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.dropTable('hall_of_pride', true);
    await queryRunner.dropTable('allowed_signup_ids', true);
    await queryRunner.dropTable('leaderboard_snapshots', true);
    await queryRunner.dropTable('notifications', true);
    await queryRunner.dropTable('research_papers', true);
    await queryRunner.dropTable('orders', true);
    await queryRunner.dropTable('products', true);
    await queryRunner.dropTable('doctors', true);
  }
}

