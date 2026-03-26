import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTeamTables1700000000005 implements MigrationInterface {
    name = 'CreateTeamTables1700000000005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create teams table (IF NOT EXISTS for idempotency)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "teams" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "leader_id" uuid NOT NULL,
                "total_sales" integer DEFAULT 0,
                "tier" character varying DEFAULT 'New Contributor',
                "tier_progress" integer DEFAULT 0,
                "next_tier" character varying,
                "remaining_amount" integer DEFAULT 0,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_teams_id" PRIMARY KEY ("id")
            )
        `);

        // Create team_members table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "team_members" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "team_id" uuid NOT NULL,
                "doctor_id" uuid NOT NULL,
                "is_leader" boolean DEFAULT false,
                "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_team_members_id" PRIMARY KEY ("id")
            )
        `);

        // Create team_invitations table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "team_invitations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "team_id" uuid NOT NULL,
                "from_doctor_id" uuid NOT NULL,
                "to_doctor_id" uuid NOT NULL,
                "message" text,
                "status" character varying DEFAULT 'pending',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_team_invitations_id" PRIMARY KEY ("id")
            )
        `);

        // Create team_tier_configs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "team_tier_configs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tier_name" character varying NOT NULL,
                "min_sales" integer NOT NULL,
                "max_sales" integer,
                "discount_percentage" integer DEFAULT 10,
                "benefits" text,
                "is_active" boolean DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_team_tier_configs_id" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints (only if they don't exist)
        const teamsConstraint = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_teams_leader_id' AND table_name = 'teams'
        `);
        if (teamsConstraint.length === 0) {
        await queryRunner.query(`
            ALTER TABLE "teams" 
            ADD CONSTRAINT "FK_teams_leader_id" 
            FOREIGN KEY ("leader_id") REFERENCES "doctors"("id") ON DELETE CASCADE
        `);
        }

        const teamMembersTeamConstraint = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_team_members_team_id' AND table_name = 'team_members'
        `);
        if (teamMembersTeamConstraint.length === 0) {
        await queryRunner.query(`
            ALTER TABLE "team_members" 
            ADD CONSTRAINT "FK_team_members_team_id" 
            FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
        `);
        }

        const teamMembersDoctorConstraint = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_team_members_doctor_id' AND table_name = 'team_members'
        `);
        if (teamMembersDoctorConstraint.length === 0) {
        await queryRunner.query(`
            ALTER TABLE "team_members" 
            ADD CONSTRAINT "FK_team_members_doctor_id" 
            FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
        `);
        }

        const teamInvitationsTeamConstraint = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_team_invitations_team_id' AND table_name = 'team_invitations'
        `);
        if (teamInvitationsTeamConstraint.length === 0) {
        await queryRunner.query(`
            ALTER TABLE "team_invitations" 
            ADD CONSTRAINT "FK_team_invitations_team_id" 
            FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
        `);
        }

        const teamInvitationsFromConstraint = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_team_invitations_from_doctor_id' AND table_name = 'team_invitations'
        `);
        if (teamInvitationsFromConstraint.length === 0) {
        await queryRunner.query(`
            ALTER TABLE "team_invitations" 
            ADD CONSTRAINT "FK_team_invitations_from_doctor_id" 
            FOREIGN KEY ("from_doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
        `);
        }

        const teamInvitationsToConstraint = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_team_invitations_to_doctor_id' AND table_name = 'team_invitations'
        `);
        if (teamInvitationsToConstraint.length === 0) {
        await queryRunner.query(`
            ALTER TABLE "team_invitations" 
            ADD CONSTRAINT "FK_team_invitations_to_doctor_id" 
            FOREIGN KEY ("to_doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
        `);
        }

        // Create indexes (IF NOT EXISTS)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_teams_leader_id" ON "teams" ("leader_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_members_team_id" ON "team_members" ("team_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_members_doctor_id" ON "team_members" ("doctor_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_invitations_team_id" ON "team_invitations" ("team_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_invitations_to_doctor_id" ON "team_invitations" ("to_doctor_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_invitations_status" ON "team_invitations" ("status")`);

        // Insert default team tier configurations (only if table is empty)
        const existingConfigs = await queryRunner.query(`SELECT COUNT(*) FROM "team_tier_configs"`);
        if (parseInt(existingConfigs[0].count) === 0) {
        await queryRunner.query(`
            INSERT INTO "team_tier_configs" ("tier_name", "min_sales", "max_sales", "discount_percentage", "benefits", "is_active") VALUES
            ('New Contributor', 0, 2499, 10, 'Basic team benefits', true),
            ('Lead Contributor', 2500, 4999, 10, 'Enhanced team benefits', true),
            ('Lead Expert', 5000, 7499, 10, 'Expert team benefits', true),
            ('Grand Lead', 7500, 9999, 10, 'Grand team benefits', true),
            ('Elite Lead', 10000, NULL, 10, 'Elite team benefits', true)
        `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_team_invitations_status"`);
        await queryRunner.query(`DROP INDEX "IDX_team_invitations_to_doctor_id"`);
        await queryRunner.query(`DROP INDEX "IDX_team_invitations_team_id"`);
        await queryRunner.query(`DROP INDEX "IDX_team_members_doctor_id"`);
        await queryRunner.query(`DROP INDEX "IDX_team_members_team_id"`);
        await queryRunner.query(`DROP INDEX "IDX_teams_leader_id"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_team_invitations_to_doctor_id"`);
        await queryRunner.query(`ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_team_invitations_from_doctor_id"`);
        await queryRunner.query(`ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_team_invitations_team_id"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_doctor_id"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_team_id"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_leader_id"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "team_tier_configs"`);
        await queryRunner.query(`DROP TABLE "team_invitations"`);
        await queryRunner.query(`DROP TABLE "team_members"`);
        await queryRunner.query(`DROP TABLE "teams"`);
    }
}
