import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCertificatesTable1700000000014 implements MigrationInterface {
    name = 'CreateCertificatesTable1700000000014'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if certificates table already exists
        const hasCertificatesTable = await queryRunner.hasTable("certificates");
        if (!hasCertificatesTable) {
            await queryRunner.query(`
                CREATE TABLE "certificates" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "doctor_id" uuid NOT NULL,
                    "certificate_type" character varying NOT NULL,
                    "title" character varying(200) NOT NULL,
                    "subtitle" text,
                    "description" text NOT NULL,
                    "achievement" character varying(100),
                    "tier_name" character varying(50),
                    "rank" integer,
                    "month" character varying(20),
                    "year" integer,
                    "status" character varying NOT NULL DEFAULT 'issued',
                    "issued_at" TIMESTAMP,
                    "verified_at" TIMESTAMP,
                    "expires_at" TIMESTAMP,
                    "certificate_url" character varying(500),
                    "verification_code" character varying(500),
                    "metadata" text,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_certificates" PRIMARY KEY ("id")
                )
            `);

            // Create indexes
            await queryRunner.query(`CREATE INDEX "IDX_certificates_doctor_id" ON "certificates" ("doctor_id")`);
            await queryRunner.query(`CREATE INDEX "IDX_certificates_certificate_type" ON "certificates" ("certificate_type")`);
            await queryRunner.query(`CREATE INDEX "IDX_certificates_status" ON "certificates" ("status")`);
            await queryRunner.query(`CREATE INDEX "IDX_certificates_issued_at" ON "certificates" ("issued_at")`);

            // Add foreign key constraint (only if doctors table exists)
            const doctorsTableExists = await queryRunner.hasTable("doctors");
            if (doctorsTableExists) {
                await queryRunner.query(`
                    DO $$ BEGIN
                        ALTER TABLE "certificates" 
                        ADD CONSTRAINT "FK_certificates_doctor_id" 
                        FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "certificates" DROP CONSTRAINT "FK_certificates_doctor_id"`);
        await queryRunner.query(`DROP INDEX "IDX_certificates_issued_at"`);
        await queryRunner.query(`DROP INDEX "IDX_certificates_status"`);
        await queryRunner.query(`DROP INDEX "IDX_certificates_certificate_type"`);
        await queryRunner.query(`DROP INDEX "IDX_certificates_doctor_id"`);
        await queryRunner.query(`DROP TABLE "certificates"`);
    }
}
