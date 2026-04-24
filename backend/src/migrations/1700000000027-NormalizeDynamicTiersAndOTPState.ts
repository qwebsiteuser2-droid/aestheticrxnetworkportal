import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeDynamicTiersAndOTPState1700000000027 implements MigrationInterface {
  name = 'NormalizeDynamicTiersAndOTPState1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasDoctors = await queryRunner.hasTable('doctors');
    const hasTierConfigs = await queryRunner.hasTable('tier_configs');
    const hasOtp = await queryRunner.hasTable('otp');

    if (hasDoctors && hasTierConfigs) {
      // Keep doctor tiers valid against currently active tier configs.
      await queryRunner.query(`
        UPDATE doctors d
        SET tier = fallback.name
        FROM (
          SELECT name
          FROM tier_configs
          WHERE is_active = true
          ORDER BY display_order ASC
          LIMIT 1
        ) AS fallback
        WHERE d.tier IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM tier_configs t
            WHERE t.is_active = true
              AND t.name = d.tier
          );
      `);
    }

    if (hasOtp) {
      // Expired OTPs should never remain active.
      await queryRunner.query(`
        UPDATE otp
        SET is_used = true,
            used_at = COALESCE(used_at, NOW())
        WHERE is_used = false
          AND expires_at < NOW();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No destructive rollback required for data normalization migration.
    return;
  }
}

