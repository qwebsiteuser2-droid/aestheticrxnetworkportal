import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorComments1700000000029 implements MigrationInterface {
  name = 'AddDoctorComments1700000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('doctor_comments');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "doctor_comments" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "doctor_id" uuid NOT NULL,
          "author_user_id" uuid,
          "author_name" varchar(255) NOT NULL,
          "comment" text NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "FK_doctor_comments_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_doctor_comments_doctor_id" ON "doctor_comments" ("doctor_id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_comments"`);
  }
}
