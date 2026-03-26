import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBioToDoctor1700000000013 implements MigrationInterface {
    name = 'AddBioToDoctor1700000000013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if doctors table exists before trying to modify it
        const doctorsTableExists = await queryRunner.hasTable("doctors");
        
        if (!doctorsTableExists) {
            // Doctors table doesn't exist yet - skip this migration
            return;
        }

        // Check if bio column already exists before adding it
        const hasBioColumn = await queryRunner.hasColumn("doctors", "bio");
        if (!hasBioColumn) {
            await queryRunner.query(`ALTER TABLE "doctors" ADD "bio" text`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "bio"`);
    }
}
