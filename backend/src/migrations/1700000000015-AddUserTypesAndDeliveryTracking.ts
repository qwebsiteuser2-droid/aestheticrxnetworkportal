import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTypesAndDeliveryTracking1700000000015 implements MigrationInterface {
    name = 'AddUserTypesAndDeliveryTracking1700000000015'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if doctors table exists before trying to modify it
        const doctorsTableExists = await queryRunner.hasTable("doctors");
        
        if (!doctorsTableExists) {
            // Doctors table doesn't exist yet - skip this migration
            return;
        }

        // Add user_type enum and column to doctors table
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "user_type_enum" AS ENUM('doctor', 'regular_user', 'employee');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        const hasUserTypeColumn = await queryRunner.hasColumn("doctors", "user_type");
        if (!hasUserTypeColumn) {
            await queryRunner.query(`
                ALTER TABLE "doctors" 
                ADD COLUMN "user_type" "user_type_enum" DEFAULT 'doctor'
            `);
        }

        // Make doctor_id nullable (only if column exists)
        const hasDoctorIdColumn = await queryRunner.hasColumn("doctors", "doctor_id");
        if (hasDoctorIdColumn) {
            await queryRunner.query(`
                ALTER TABLE "doctors" 
                ALTER COLUMN "doctor_id" DROP NOT NULL
            `);
        }

        // Make signup_id nullable (only if column exists)
        const hasSignupIdColumn = await queryRunner.hasColumn("doctors", "signup_id");
        if (hasSignupIdColumn) {
            await queryRunner.query(`
                ALTER TABLE "doctors" 
                ALTER COLUMN "signup_id" DROP NOT NULL
            `);
        }

        // Make clinic_name nullable
        const hasClinicNameColumn = await queryRunner.hasColumn("doctors", "clinic_name");
        if (hasClinicNameColumn) {
            await queryRunner.query(`
                ALTER TABLE "doctors" 
                ALTER COLUMN "clinic_name" DROP NOT NULL
            `);
        }

        // Add delivery tracking fields to orders table
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "delivery_status_enum" AS ENUM('pending', 'assigned', 'in_transit', 'delivered');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        const hasAssignedEmployeeId = await queryRunner.hasColumn("orders", "assigned_employee_id");
        if (!hasAssignedEmployeeId) {
            await queryRunner.query(`
                ALTER TABLE "orders" 
                ADD COLUMN "assigned_employee_id" uuid
            `);
        }

        const hasDeliveryStatus = await queryRunner.hasColumn("orders", "delivery_status");
        if (!hasDeliveryStatus) {
            await queryRunner.query(`
                ALTER TABLE "orders" 
                ADD COLUMN "delivery_status" "delivery_status_enum" DEFAULT 'pending'
            `);
        }

        const hasDeliveryAssignedAt = await queryRunner.hasColumn("orders", "delivery_assigned_at");
        if (!hasDeliveryAssignedAt) {
            await queryRunner.query(`
                ALTER TABLE "orders" 
                ADD COLUMN "delivery_assigned_at" timestamp
            `);
        }

        const hasDeliveryStartedAt = await queryRunner.hasColumn("orders", "delivery_started_at");
        if (!hasDeliveryStartedAt) {
            await queryRunner.query(`
                ALTER TABLE "orders" 
                ADD COLUMN "delivery_started_at" timestamp
            `);
        }

        const hasDeliveryCompletedAt = await queryRunner.hasColumn("orders", "delivery_completed_at");
        if (!hasDeliveryCompletedAt) {
            await queryRunner.query(`
                ALTER TABLE "orders" 
                ADD COLUMN "delivery_completed_at" timestamp
            `);
        }

        const hasDeliveryLocation = await queryRunner.hasColumn("orders", "delivery_location");
        if (!hasDeliveryLocation) {
            await queryRunner.query(`
                ALTER TABLE "orders" 
                ADD COLUMN "delivery_location" jsonb
            `);
        }

        // Add foreign key constraint for assigned_employee_id
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "orders" 
                ADD CONSTRAINT "FK_orders_assigned_employee" 
                FOREIGN KEY ("assigned_employee_id") 
                REFERENCES "doctors"("id") 
                ON DELETE SET NULL;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "orders" 
            DROP CONSTRAINT IF EXISTS "FK_orders_assigned_employee"
        `);

        // Remove delivery tracking columns
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivery_location"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivery_completed_at"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivery_started_at"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivery_assigned_at"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivery_status"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "assigned_employee_id"`);

        // Drop delivery_status enum
        await queryRunner.query(`DROP TYPE IF EXISTS "delivery_status_enum"`);

        // Revert doctors table changes
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN IF EXISTS "user_type"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "user_type_enum"`);

        // Note: We don't revert nullable changes to maintain data integrity
    }
}
