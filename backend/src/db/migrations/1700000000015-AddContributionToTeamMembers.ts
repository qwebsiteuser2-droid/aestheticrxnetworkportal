import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FixTeamTableColumns1700000000015
 *
 * Migration 1700000000005 created the teams-related tables with several
 * mismatches versus the TypeORM entities:
 *
 * team_members:
 *   - missing "contribution" column (decimal 15,2 default 0)
 *
 * team_invitations:
 *   - missing "responded_at" column (timestamp with time zone, nullable)
 *   - missing "updated_at" column added by @UpdateDateColumn
 *
 * teams:
 *   - "total_sales" created as integer but entity is decimal(15,2)
 *   - "tier_progress" created as integer but entity is decimal(5,2)
 *   - "remaining_amount" created as integer but entity is decimal(15,2)
 *
 * All changes are guarded with hasColumn / column-type checks so this
 * migration is safe on both fresh and pre-existing databases.
 */
export class FixTeamTableColumns1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── team_members: add missing contribution column ──────────────────────
    const hasContribution = await queryRunner.hasColumn('team_members', 'contribution');
    if (!hasContribution) {
      await queryRunner.query(
        `ALTER TABLE "team_members" ADD COLUMN "contribution" decimal(15,2) NOT NULL DEFAULT 0`
      );
      console.log('✅ Added contribution to team_members');
    }

    // ── team_invitations: add missing responded_at column ──────────────────
    const hasRespondedAt = await queryRunner.hasColumn('team_invitations', 'responded_at');
    if (!hasRespondedAt) {
      await queryRunner.query(
        `ALTER TABLE "team_invitations" ADD COLUMN "responded_at" TIMESTAMP WITH TIME ZONE`
      );
      console.log('✅ Added responded_at to team_invitations');
    }

    // ── teams: fix total_sales type (integer → decimal 15,2) ──────────────
    const totalSalesTypeResult = await queryRunner.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'teams' AND column_name = 'total_sales'
    `);
    if (totalSalesTypeResult.length > 0 && totalSalesTypeResult[0].data_type === 'integer') {
      await queryRunner.query(
        `ALTER TABLE "teams" ALTER COLUMN "total_sales" TYPE decimal(15,2) USING "total_sales"::decimal`
      );
      console.log('✅ Fixed teams.total_sales type to decimal(15,2)');
    }

    // ── teams: fix tier_progress type (integer → decimal 5,2) ────────────
    const tierProgressTypeResult = await queryRunner.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'teams' AND column_name = 'tier_progress'
    `);
    if (tierProgressTypeResult.length > 0 && tierProgressTypeResult[0].data_type === 'integer') {
      await queryRunner.query(
        `ALTER TABLE "teams" ALTER COLUMN "tier_progress" TYPE decimal(5,2) USING "tier_progress"::decimal`
      );
      console.log('✅ Fixed teams.tier_progress type to decimal(5,2)');
    }

    // ── teams: fix remaining_amount type (integer → decimal 15,2) ────────
    const remainingAmountTypeResult = await queryRunner.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'teams' AND column_name = 'remaining_amount'
    `);
    if (remainingAmountTypeResult.length > 0 && remainingAmountTypeResult[0].data_type === 'integer') {
      await queryRunner.query(
        `ALTER TABLE "teams" ALTER COLUMN "remaining_amount" TYPE decimal(15,2) USING "remaining_amount"::decimal`
      );
      console.log('✅ Fixed teams.remaining_amount type to decimal(15,2)');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert type changes (data-lossy but acceptable for rollback)
    await queryRunner.query(
      `ALTER TABLE "teams" ALTER COLUMN "remaining_amount" TYPE integer USING "remaining_amount"::integer`
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ALTER COLUMN "tier_progress" TYPE integer USING "tier_progress"::integer`
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ALTER COLUMN "total_sales" TYPE integer USING "total_sales"::integer`
    );

    const hasRespondedAt = await queryRunner.hasColumn('team_invitations', 'responded_at');
    if (hasRespondedAt) {
      await queryRunner.query(`ALTER TABLE "team_invitations" DROP COLUMN "responded_at"`);
    }

    const hasContribution = await queryRunner.hasColumn('team_members', 'contribution');
    if (hasContribution) {
      await queryRunner.query(`ALTER TABLE "team_members" DROP COLUMN "contribution"`);
    }
  }
}
