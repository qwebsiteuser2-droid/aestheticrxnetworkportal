import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserWalletTables1700000000011 implements MigrationInterface {
  name = 'CreateUserWalletTables1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if required base tables exist before creating wallet tables
    const doctorsTableExists = await queryRunner.hasTable("doctors");
    const ordersTableExists = await queryRunner.hasTable("orders");
    
    if (!doctorsTableExists) {
      // Doctors table doesn't exist yet - skip this migration
      // It will be safe to run this migration again later when the table exists
      return;
    }

    // Check if tables already exist (idempotent)
    const walletsTableExists = await queryRunner.hasTable("user_wallets");
    const transactionsTableExists = await queryRunner.hasTable("wallet_transactions");

    // Create user_wallets table if it doesn't exist
    if (!walletsTableExists) {
      await queryRunner.query(`
        CREATE TABLE "user_wallets" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "doctor_id" uuid NOT NULL,
          "balance" numeric(10,2) NOT NULL DEFAULT '0',
          "total_deposited" numeric(10,2) NOT NULL DEFAULT '0',
          "total_spent" numeric(10,2) NOT NULL DEFAULT '0',
          "total_earned" numeric(10,2) NOT NULL DEFAULT '0',
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_user_wallets" PRIMARY KEY ("id")
        )
      `);
    }

    // Create wallet_transactions table if it doesn't exist
    if (!transactionsTableExists) {
      await queryRunner.query(`
        CREATE TABLE "wallet_transactions" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "doctor_id" uuid NOT NULL,
          "order_id" uuid,
          "type" character varying NOT NULL,
          "status" character varying NOT NULL DEFAULT 'pending',
          "amount" numeric(10,2) NOT NULL,
          "balance_before" numeric(10,2) NOT NULL,
          "balance_after" numeric(10,2) NOT NULL,
          "description" character varying(255),
          "reference" character varying(255),
          "metadata" jsonb,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id")
        )
      `);
    }

    // Create indexes (idempotent with IF NOT EXISTS)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_wallets_doctor_id" ON "user_wallets" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_wallets_created_at" ON "user_wallets" ("created_at")`);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_doctor_id" ON "wallet_transactions" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_type" ON "wallet_transactions" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_status" ON "wallet_transactions" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_created_at" ON "wallet_transactions" ("created_at")`);

    // Add foreign key constraints (only if they don't exist)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        -- Add foreign key to doctors table
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_user_wallets_doctor_id' 
          AND table_name = 'user_wallets'
        ) THEN
          ALTER TABLE "user_wallets" 
          ADD CONSTRAINT "FK_user_wallets_doctor_id" 
          FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_wallet_transactions_doctor_id' 
          AND table_name = 'wallet_transactions'
        ) THEN
          ALTER TABLE "wallet_transactions" 
          ADD CONSTRAINT "FK_wallet_transactions_doctor_id" 
          FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
        END IF;

        -- Add foreign key to orders table (only if orders table exists)
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'orders'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_wallet_transactions_order_id' 
          AND table_name = 'wallet_transactions'
        ) THEN
          ALTER TABLE "wallet_transactions" 
          ADD CONSTRAINT "FK_wallet_transactions_order_id" 
          FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
        END IF;

        -- Create unique constraint for one wallet per doctor
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'UQ_user_wallets_doctor_id' 
          AND table_name = 'user_wallets'
        ) THEN
          ALTER TABLE "user_wallets" 
          ADD CONSTRAINT "UQ_user_wallets_doctor_id" UNIQUE ("doctor_id");
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_wallet_transactions_order_id"`);
    await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_wallet_transactions_doctor_id"`);
    await queryRunner.query(`ALTER TABLE "user_wallets" DROP CONSTRAINT "FK_user_wallets_doctor_id"`);

    // Drop unique constraints
    await queryRunner.query(`ALTER TABLE "user_wallets" DROP CONSTRAINT "UQ_user_wallets_doctor_id"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_wallet_transactions_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_wallet_transactions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_wallet_transactions_type"`);
    await queryRunner.query(`DROP INDEX "IDX_wallet_transactions_doctor_id"`);
    
    await queryRunner.query(`DROP INDEX "IDX_user_wallets_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_user_wallets_doctor_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE "user_wallets"`);
  }
}
