import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailDeliveriesTable1700000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create email_deliveries table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_deliveries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "recipient_id" uuid,
        "recipient_email" varchar(255) NOT NULL,
        "subject" varchar(500) NOT NULL,
        "status" varchar(50) DEFAULT 'pending',
        "email_type" varchar(50) DEFAULT 'marketing',
        "retry_count" integer DEFAULT 0,
        "sent_at" timestamp,
        "delivered_at" timestamp,
        "bounced_at" timestamp,
        "failed_at" timestamp,
        "error_message" text,
        "bounce_reason" text,
        "is_opened" boolean DEFAULT false,
        "opened_at" timestamp,
        "is_clicked" boolean DEFAULT false,
        "clicked_at" timestamp,
        "campaign_id" varchar(255),
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_recipient_id" 
      ON "email_deliveries" ("recipient_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_status" 
      ON "email_deliveries" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_email_type" 
      ON "email_deliveries" ("email_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_created_at" 
      ON "email_deliveries" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_sent_at" 
      ON "email_deliveries" ("sent_at")
    `);

    // Create foreign key to doctors table (only if doctors table exists)
    const doctorsTableExists = await queryRunner.hasTable("doctors");
    if (doctorsTableExists) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "email_deliveries" 
          ADD CONSTRAINT "FK_email_deliveries_recipient" 
          FOREIGN KEY ("recipient_id") 
          REFERENCES "doctors"("id") 
          ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "email_deliveries" 
      DROP CONSTRAINT IF EXISTS "FK_email_deliveries_recipient"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_deliveries_sent_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_deliveries_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_deliveries_email_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_deliveries_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_deliveries_recipient_id"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "email_deliveries"`);
  }
}

