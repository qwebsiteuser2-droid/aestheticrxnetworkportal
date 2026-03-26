import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FixAllSchemaMismatches1700000000016
 *
 * Comprehensive fix for every column gap found between the TypeORM entity
 * definitions and what the earlier migrations actually created in PostgreSQL.
 * Every change is guarded so it is safe to run on both fresh and existing DBs.
 *
 * Summary of fixes:
 *
 * products
 *   - ADD image_data (text, nullable)  ← entity has it, migration 001 does not
 *
 * teams
 *   - FIX default for `tier` column: 'New Contributor' → 'Lead Starter'
 *
 * team_tier_configs
 *   - ADD name           (varchar 100, unique)  ← mapped from existing tier_name data
 *   - ADD description    (text)
 *   - ADD icon           (varchar 10)
 *   - ADD color          (varchar 50)
 *   - ADD individual_threshold (decimal 15,2)   ← derived from min_sales data
 *   - ADD max_members    (integer default 3)
 *   - ADD discount_2_members (decimal 5,2 default 5)
 *   - ADD discount_3_members (decimal 5,2 default 10)
 *   - ADD discount_4_members (decimal 5,2 default 15)
 *   - ADD display_order  (integer default 0)
 *
 * advertisement_placements
 *   - ADD device_type          (varchar NOT NULL DEFAULT 'all')
 *   - ADD responsive_breakpoints (json, nullable)
 */
export class FixAllSchemaMismatches1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ──────────────────────────────────────────────────────────────────────
    // products.image_data
    // ──────────────────────────────────────────────────────────────────────
    const hasImageData = await queryRunner.hasColumn('products', 'image_data');
    if (!hasImageData) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "image_data" text`);
      console.log('✅ Added products.image_data');
    }

    // ──────────────────────────────────────────────────────────────────────
    // teams.tier default value mismatch
    // ──────────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "teams" ALTER COLUMN "tier" SET DEFAULT 'Lead Starter'`
    );
    console.log('✅ Fixed teams.tier default to Lead Starter');

    // ──────────────────────────────────────────────────────────────────────
    // team_tier_configs: add columns that the entity expects but migration
    // 1700000000005 never created.
    // We keep the old columns (tier_name, min_sales, etc.) intact so
    // existing data is not lost.
    // ──────────────────────────────────────────────────────────────────────
    const hasName = await queryRunner.hasColumn('team_tier_configs', 'name');
    if (!hasName) {
      // Add `name` as nullable first, backfill from tier_name, then set unique + not null
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "name" character varying(100)`
      );
      // Backfill from tier_name (which the old migration created and seeded)
      const hasTierName = await queryRunner.hasColumn('team_tier_configs', 'tier_name');
      if (hasTierName) {
        await queryRunner.query(
          `UPDATE "team_tier_configs" SET "name" = "tier_name" WHERE "name" IS NULL`
        );
      }
      // If still null (empty table), set a placeholder so NOT NULL constraint can be added
      await queryRunner.query(
        `UPDATE "team_tier_configs" SET "name" = 'Tier-' || id::text WHERE "name" IS NULL`
      );
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ALTER COLUMN "name" SET NOT NULL`
      );
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD CONSTRAINT "UQ_team_tier_configs_name" UNIQUE ("name")`
      );
      console.log('✅ Added team_tier_configs.name');
    }

    const hasDescription = await queryRunner.hasColumn('team_tier_configs', 'description');
    if (!hasDescription) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "description" text NOT NULL DEFAULT ''`
      );
      console.log('✅ Added team_tier_configs.description');
    }

    const hasIcon = await queryRunner.hasColumn('team_tier_configs', 'icon');
    if (!hasIcon) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "icon" character varying(10) NOT NULL DEFAULT '⭐'`
      );
      console.log('✅ Added team_tier_configs.icon');
    }

    const hasColor = await queryRunner.hasColumn('team_tier_configs', 'color');
    if (!hasColor) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "color" character varying(50) NOT NULL DEFAULT '#6366f1'`
      );
      console.log('✅ Added team_tier_configs.color');
    }

    const hasIndividualThreshold = await queryRunner.hasColumn('team_tier_configs', 'individual_threshold');
    if (!hasIndividualThreshold) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "individual_threshold" decimal(15,2) NOT NULL DEFAULT 0`
      );
      // Backfill from min_sales if it exists
      const hasMinSales = await queryRunner.hasColumn('team_tier_configs', 'min_sales');
      if (hasMinSales) {
        await queryRunner.query(
          `UPDATE "team_tier_configs" SET "individual_threshold" = "min_sales" WHERE "individual_threshold" = 0`
        );
      }
      console.log('✅ Added team_tier_configs.individual_threshold');
    }

    const hasMaxMembers = await queryRunner.hasColumn('team_tier_configs', 'max_members');
    if (!hasMaxMembers) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "max_members" integer NOT NULL DEFAULT 3`
      );
      console.log('✅ Added team_tier_configs.max_members');
    }

    const hasDiscount2 = await queryRunner.hasColumn('team_tier_configs', 'discount_2_members');
    if (!hasDiscount2) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "discount_2_members" decimal(5,2) NOT NULL DEFAULT 5.00`
      );
      console.log('✅ Added team_tier_configs.discount_2_members');
    }

    const hasDiscount3 = await queryRunner.hasColumn('team_tier_configs', 'discount_3_members');
    if (!hasDiscount3) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "discount_3_members" decimal(5,2) NOT NULL DEFAULT 10.00`
      );
      console.log('✅ Added team_tier_configs.discount_3_members');
    }

    const hasDiscount4 = await queryRunner.hasColumn('team_tier_configs', 'discount_4_members');
    if (!hasDiscount4) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "discount_4_members" decimal(5,2) NOT NULL DEFAULT 15.00`
      );
      console.log('✅ Added team_tier_configs.discount_4_members');
    }

    const hasDisplayOrder = await queryRunner.hasColumn('team_tier_configs', 'display_order');
    if (!hasDisplayOrder) {
      await queryRunner.query(
        `ALTER TABLE "team_tier_configs" ADD COLUMN "display_order" integer NOT NULL DEFAULT 0`
      );
      console.log('✅ Added team_tier_configs.display_order');
    }

    // ──────────────────────────────────────────────────────────────────────
    // advertisement_placements: device_type + responsive_breakpoints
    // ──────────────────────────────────────────────────────────────────────
    const hasDeviceType = await queryRunner.hasColumn('advertisement_placements', 'device_type');
    if (!hasDeviceType) {
      await queryRunner.query(
        `ALTER TABLE "advertisement_placements" ADD COLUMN "device_type" character varying NOT NULL DEFAULT 'all'`
      );
      console.log('✅ Added advertisement_placements.device_type');
    }

    const hasResponsiveBreakpoints = await queryRunner.hasColumn('advertisement_placements', 'responsive_breakpoints');
    if (!hasResponsiveBreakpoints) {
      await queryRunner.query(
        `ALTER TABLE "advertisement_placements" ADD COLUMN "responsive_breakpoints" json`
      );
      console.log('✅ Added advertisement_placements.responsive_breakpoints');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "advertisement_placements" DROP COLUMN IF EXISTS "responsive_breakpoints"`
    );
    await queryRunner.query(
      `ALTER TABLE "advertisement_placements" DROP COLUMN IF EXISTS "device_type"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "display_order"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "discount_4_members"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "discount_3_members"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "discount_2_members"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "max_members"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "individual_threshold"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "color"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "icon"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "description"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP CONSTRAINT IF EXISTS "UQ_team_tier_configs_name"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_tier_configs" DROP COLUMN IF EXISTS "name"`
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ALTER COLUMN "tier" SET DEFAULT 'New Contributor'`
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "image_data"`
    );
  }
}
