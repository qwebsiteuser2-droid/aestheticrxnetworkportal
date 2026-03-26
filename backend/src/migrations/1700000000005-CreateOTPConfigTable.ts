import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOTPConfigTable1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use raw SQL to avoid TypeORM default value issues
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS otp_configs (
        "userType" VARCHAR(50) PRIMARY KEY,
        duration INTEGER NOT NULL DEFAULT 24,
        "durationType" VARCHAR(20) NOT NULL DEFAULT 'hours',
        "isRequired" BOOLEAN NOT NULL DEFAULT false,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default configurations
    await queryRunner.query(`
      INSERT INTO otp_configs ("userType", duration, "durationType", "isRequired", description, created_at, updated_at)
      VALUES 
        ('regular', 24, 'hours', true, 'OTP required for regular users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('admin', 1, 'hours', true, 'OTP required for every admin login', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("userType") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('otp_configs');
  }
}
