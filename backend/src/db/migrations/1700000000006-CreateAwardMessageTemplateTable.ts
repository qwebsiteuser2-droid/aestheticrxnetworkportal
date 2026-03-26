import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAwardMessageTemplateTable1700000000006 implements MigrationInterface {
  name = 'CreateAwardMessageTemplateTable1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "award_message_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_key" character varying(100) NOT NULL,
        "template_name" character varying(200) NOT NULL,
        "template_type" text NOT NULL,
        "subject_template" character varying(200) NOT NULL,
        "content_template" text NOT NULL,
        "certificate_title" text,
        "certificate_subtitle" text,
        "certificate_achievement_text" text,
        "certificate_description" text,
        "certificate_footer" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "language" character varying(50) NOT NULL DEFAULT 'en',
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_award_message_templates_template_key" UNIQUE ("template_key"),
        CONSTRAINT "PK_award_message_templates" PRIMARY KEY ("id")
      )
    `);

    // Create index for better performance (IF NOT EXISTS)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_award_message_templates_template_key" ON "award_message_templates" ("template_key")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_award_message_templates_template_type" ON "award_message_templates" ("template_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_award_message_templates_template_type"`);
    await queryRunner.query(`DROP INDEX "IDX_award_message_templates_template_key"`);
    await queryRunner.query(`DROP TABLE "award_message_templates"`);
  }
}
