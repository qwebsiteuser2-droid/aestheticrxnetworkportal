import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddContributionToTeamMembers1700000000015
 *
 * The TeamMember entity defines a `contribution` column
 * (decimal 15,2 default 0) but migration 1700000000005 created
 * the team_members table without it, causing a 500 on any query
 * that joins team_members (e.g. leaderboard, teams endpoints).
 *
 * This migration adds the column if it doesn't already exist
 * so it is safe to run against both fresh and pre-existing databases.
 */
export class AddContributionToTeamMembers1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('team_members', 'contribution');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "team_members" ADD COLUMN "contribution" decimal(15,2) NOT NULL DEFAULT 0`
      );
      console.log('✅ Added contribution column to team_members');
    } else {
      console.log('ℹ️ contribution column already exists in team_members, skipping');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('team_members', 'contribution');
    if (hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "team_members" DROP COLUMN "contribution"`
      );
    }
  }
}
