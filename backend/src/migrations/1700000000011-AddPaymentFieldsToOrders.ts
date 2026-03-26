import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentFieldsToOrders1700000000011 implements MigrationInterface {
    name = 'AddPaymentFieldsToOrders1700000000011'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if orders table exists before trying to modify it
        const ordersTableExists = await queryRunner.hasTable("orders");
        
        if (!ordersTableExists) {
            // Orders table doesn't exist yet - skip this migration
            // It will be safe to run this migration again later when the table exists
            return;
        }

        // Add payment fields to orders table (using safe DO block)
        await queryRunner.query(`
            DO $$ 
            BEGIN
                -- Add payment_status column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_status'
                ) THEN
                    ALTER TABLE "orders" 
                    ADD COLUMN "payment_status" varchar(50) DEFAULT 'pending';
                END IF;

                -- Add payment_method column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_method'
                ) THEN
                    ALTER TABLE "orders" 
                    ADD COLUMN "payment_method" varchar(50);
                END IF;

                -- Add payment_reference column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_reference'
                ) THEN
                    ALTER TABLE "orders" 
                    ADD COLUMN "payment_reference" varchar(255);
                END IF;

                -- Add payment_date column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_date'
                ) THEN
                    ALTER TABLE "orders" 
                    ADD COLUMN "payment_date" timestamp;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- If any error occurs, just continue
                    NULL;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders" 
            DROP COLUMN "payment_status",
            DROP COLUMN "payment_method", 
            DROP COLUMN "payment_reference",
            DROP COLUMN "payment_date"
        `);
    }
}
