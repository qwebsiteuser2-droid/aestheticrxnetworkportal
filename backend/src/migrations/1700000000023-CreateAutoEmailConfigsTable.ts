import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAutoEmailConfigsTable1700000000023 implements MigrationInterface {
  name = 'CreateAutoEmailConfigsTable1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use raw SQL with IF NOT EXISTS for better idempotency
    // This pattern matches other migrations and prevents errors if run multiple times
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auto_email_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "config_id" varchar(255) NOT NULL DEFAULT 'auto-email-config',
        "subject" varchar(500) NOT NULL,
        "content" text NOT NULL,
        "duration_hours" int NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "last_sent" timestamp,
        "next_send" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_6b72c6729b8a7f2483f0490b43e" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_8175c70b52de5b2a1b9423586b3" UNIQUE ("config_id")
      )
    `);

    // Create indexes if they don't exist (idempotent)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auto_email_configs_config_id" 
      ON "auto_email_configs" ("config_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auto_email_configs_id" 
      ON "auto_email_configs" ("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists before dropping
    const tableExists = await queryRunner.hasTable('auto_email_configs');
    if (tableExists) {
      await queryRunner.query(`DROP TABLE IF EXISTS "auto_email_configs"`);
    }
  }
}

