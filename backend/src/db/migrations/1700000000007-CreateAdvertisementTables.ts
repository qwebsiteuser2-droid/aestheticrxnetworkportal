import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdvertisementTables1700000000007 implements MigrationInterface {
  name = 'CreateAdvertisementTables1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create advertisement_placements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "advertisement_placements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "type" character varying NOT NULL,
        "position" character varying(50) NOT NULL,
        "max_ads" integer NOT NULL DEFAULT '1',
        "current_ads" integer NOT NULL DEFAULT '0',
        "dimensions" json,
        "styles" json,
        "allow_user_selection" boolean NOT NULL DEFAULT true,
        "visible_to_guests" boolean NOT NULL DEFAULT true,
        "status" character varying NOT NULL DEFAULT 'active',
        "priority" integer NOT NULL DEFAULT '0',
        "admin_notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_advertisement_placements" PRIMARY KEY ("id")
      )
    `);

    // Create advertisements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "advertisements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(200) NOT NULL,
        "description" text,
        "type" character varying NOT NULL,
        "image_url" character varying(500),
        "video_url" character varying(500),
        "content" text,
        "target_url" character varying(500),
        "button_text" character varying(100),
        "button_color" character varying(7),
        "background_color" character varying(7),
        "text_color" character varying(7),
        "budget" integer NOT NULL DEFAULT '0',
        "spent" integer NOT NULL DEFAULT '0',
        "impressions" integer NOT NULL DEFAULT '0',
        "clicks" integer NOT NULL DEFAULT '0',
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "is_active" boolean NOT NULL DEFAULT true,
        "admin_override_placement" boolean NOT NULL DEFAULT false,
        "admin_placement_notes" character varying(200),
        "rejection_reason" text,
        "priority" integer NOT NULL DEFAULT '0',
        "targeting" json,
        "schedule" json,
        "doctor_id" uuid NOT NULL,
        "placement_id" uuid NOT NULL,
        "requested_placement_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_advertisements" PRIMARY KEY ("id")
      )
    `);

    // Create advertisement_applications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "advertisement_applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(200) NOT NULL,
        "description" text,
        "image_url" character varying(500),
        "target_url" character varying(500),
        "button_text" character varying(100),
        "button_color" character varying(7),
        "background_color" character varying(7),
        "text_color" character varying(7),
        "budget" integer NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "admin_notes" text,
        "requested_placements" json,
        "approved_placement_id" uuid,
        "doctor_id" uuid NOT NULL,
        "advertisement_id" uuid,
        "contact_preferences" text,
        "placement_change_notified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_advertisement_applications" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints (only if they don't exist)
    const advDoctorFK = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_advertisements_doctor' AND table_name = 'advertisements'
    `);
    if (advDoctorFK.length === 0) {
    await queryRunner.query(`
      ALTER TABLE "advertisements" 
      ADD CONSTRAINT "FK_advertisements_doctor" 
      FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    }

    const advPlacementFK = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_advertisements_placement' AND table_name = 'advertisements'
    `);
    if (advPlacementFK.length === 0) {
    await queryRunner.query(`
      ALTER TABLE "advertisements" 
      ADD CONSTRAINT "FK_advertisements_placement" 
      FOREIGN KEY ("placement_id") REFERENCES "advertisement_placements"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    }

    const advReqPlacementFK = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_advertisements_requested_placement' AND table_name = 'advertisements'
    `);
    if (advReqPlacementFK.length === 0) {
    await queryRunner.query(`
      ALTER TABLE "advertisements" 
      ADD CONSTRAINT "FK_advertisements_requested_placement" 
      FOREIGN KEY ("requested_placement_id") REFERENCES "advertisement_placements"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    }

    const appDoctorFK = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_advertisement_applications_doctor' AND table_name = 'advertisement_applications'
    `);
    if (appDoctorFK.length === 0) {
    await queryRunner.query(`
      ALTER TABLE "advertisement_applications" 
      ADD CONSTRAINT "FK_advertisement_applications_doctor" 
      FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    }

    const appPlacementFK = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_advertisement_applications_approved_placement' AND table_name = 'advertisement_applications'
    `);
    if (appPlacementFK.length === 0) {
    await queryRunner.query(`
      ALTER TABLE "advertisement_applications" 
      ADD CONSTRAINT "FK_advertisement_applications_approved_placement" 
      FOREIGN KEY ("approved_placement_id") REFERENCES "advertisement_placements"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    }

    // Create indexes (IF NOT EXISTS)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_advertisement_placements_type" ON "advertisement_placements" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_advertisement_placements_status" ON "advertisement_placements" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_advertisements_status" ON "advertisements" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_advertisements_placement" ON "advertisements" ("placement_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_advertisements_doctor" ON "advertisements" ("doctor_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_advertisements_dates" ON "advertisements" ("start_date", "end_date")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_advertisement_applications_status" ON "advertisement_applications" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_advertisement_applications_doctor" ON "advertisement_applications" ("doctor_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_advertisement_applications_doctor"`);
    await queryRunner.query(`DROP INDEX "IDX_advertisement_applications_status"`);
    await queryRunner.query(`DROP INDEX "IDX_advertisements_dates"`);
    await queryRunner.query(`DROP INDEX "IDX_advertisements_doctor"`);
    await queryRunner.query(`DROP INDEX "IDX_advertisements_placement"`);
    await queryRunner.query(`DROP INDEX "IDX_advertisements_status"`);
    await queryRunner.query(`DROP INDEX "IDX_advertisement_placements_status"`);
    await queryRunner.query(`DROP INDEX "IDX_advertisement_placements_type"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "advertisement_applications" DROP CONSTRAINT "FK_advertisement_applications_approved_placement"`);
    await queryRunner.query(`ALTER TABLE "advertisement_applications" DROP CONSTRAINT "FK_advertisement_applications_doctor"`);
    await queryRunner.query(`ALTER TABLE "advertisements" DROP CONSTRAINT "FK_advertisements_requested_placement"`);
    await queryRunner.query(`ALTER TABLE "advertisements" DROP CONSTRAINT "FK_advertisements_placement"`);
    await queryRunner.query(`ALTER TABLE "advertisements" DROP CONSTRAINT "FK_advertisements_doctor"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "advertisement_applications"`);
    await queryRunner.query(`DROP TABLE "advertisements"`);
    await queryRunner.query(`DROP TABLE "advertisement_placements"`);
  }
}
