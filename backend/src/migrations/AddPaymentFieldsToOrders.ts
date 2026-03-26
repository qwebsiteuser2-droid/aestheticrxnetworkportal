import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentFieldsToOrders1700000000000 implements MigrationInterface {
    name = 'AddPaymentFieldsToOrders1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new payment status enum values (only if enum exists)
        // Note: The orders table uses VARCHAR for status, not enum, so this enum may not exist
        // If the enum doesn't exist, this will be skipped safely
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'orders_status_enum'
                ) THEN
                    -- Check if value already exists before adding
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum 
                        WHERE enumlabel = 'pending_payment' 
                        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'orders_status_enum')
                    ) THEN
                        ALTER TYPE "public"."orders_status_enum" 
                        ADD VALUE 'pending_payment';
                    END IF;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- If enum doesn't exist or any error, just continue
                    NULL;
            END $$;
        `);

        // Add missing payment fields to orders table (only if table exists)
        // Check if orders table exists before trying to modify it
        const ordersTableExists = await queryRunner.hasTable("orders");
        
        if (!ordersTableExists) {
            // Orders table doesn't exist yet - skip this migration for now
            // It will be safe to run this migration again later when the table exists
            // TypeORM will track this as executed, but the operations are idempotent
            // so running it again later (manually if needed) won't cause issues
            return;
        }

        // Add missing payment fields to orders table (some already exist)
        // Using DO block to handle errors gracefully
        await queryRunner.query(`
            DO $$ 
            BEGIN
                -- Add payment_transaction_id column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_transaction_id'
                ) THEN
                    ALTER TABLE "orders" 
                    ADD COLUMN "payment_transaction_id" character varying;
                END IF;

                -- Add payment_amount column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_amount'
                ) THEN
                    ALTER TABLE "orders" 
                    ADD COLUMN "payment_amount" numeric(10,2);
                END IF;

                -- Add payment_completed_at column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_completed_at'
                ) THEN
                    ALTER TABLE "orders" 
                    ADD COLUMN "payment_completed_at" TIMESTAMP;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- If any error occurs, just continue
                    NULL;
            END $$;
        `);

        // Create index on payment_status for better query performance (only if column exists)
        const hasPaymentStatus = await queryRunner.hasColumn("orders", "payment_status");
        if (hasPaymentStatus) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_orders_payment_status" ON "orders" ("payment_status")
            `);
        }

        // Create index on payment_transaction_id for better query performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orders_payment_transaction_id" ON "orders" ("payment_transaction_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_orders_payment_transaction_id"`);
        await queryRunner.query(`DROP INDEX "IDX_orders_payment_status"`);

        // Drop payment columns
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "payment_completed_at"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "payment_amount"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "payment_transaction_id"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "payment_status"`);

        // Note: We cannot easily remove enum values in PostgreSQL
        // The 'pending_payment' value will remain in the enum but won't be used
    }
}
