import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateBaseTables1700000000001
 *
 * Creates all core/base tables that pre-date the numbered TypeORM migration chain.
 * Every DDL statement uses IF NOT EXISTS so this migration is idempotent on
 * databases that were created before the migration system was introduced.
 *
 * Tables covered here are NOT created by any other migration in the chain
 * (migrations 004-014 either add columns to existing tables or create
 * feature-specific tables that reference doctors).
 *
 * Columns intentionally excluded because they are added by later migrations:
 *   - is_deactivated          → 1700000000008-AddIsDeactivatedToDoctor
 *   - is_online, availability_status, last_active_at, specialties
 *                             → 1700000000012-AddDoctorAvailabilityFields
 */
export class CreateBaseTables1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------
    // 1. EXTENSIONS
    // ------------------------------------------------------------------
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ------------------------------------------------------------------
    // 2. SEQUENCES (idempotent via DO block)
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE SEQUENCE IF NOT EXISTS doctor_id_seq START 42001;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ------------------------------------------------------------------
    // 3. ENUM TYPES
    // ------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_type_enum AS ENUM ('doctor', 'regular_user', 'employee');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE order_status_enum AS ENUM ('pending', 'pending_payment', 'accepted', 'completed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE delivery_status_enum AS ENUM ('pending', 'assigned', 'in_transit', 'delivered');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE admin_permission_type_enum AS ENUM ('viewer', 'custom', 'full');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE benefit_type_enum AS ENUM ('gift', 'tier_progress', 'bonus_approvals');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE reward_status_enum AS ENUM ('eligible', 'delivered', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE report_type_enum AS ENUM ('plagiarism', 'misinformation', 'inappropriate_content', 'spam', 'other');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE report_status_enum AS ENUM ('pending', 'under_review', 'resolved', 'dismissed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE certificate_type_enum AS ENUM (
          'tier_achievement', 'research_excellence', 'monthly_winner',
          'special_achievement', 'medical_qualification', 'leadership', 'innovation'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE certificate_status_enum AS ENUM ('issued', 'verified', 'expired', 'revoked');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE badge_type_enum AS ENUM ('achievement', 'milestone', 'special');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE email_status_enum AS ENUM ('pending', 'sent', 'failed', 'bounced', 'delivered');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE email_type_enum AS ENUM ('marketing', 'transactional', 'otp', 'campaign', 'bulk');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ------------------------------------------------------------------
    // 4. CORE TABLES
    // ------------------------------------------------------------------

    // doctors
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctors" (
        "id"                    uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"             integer       UNIQUE,
        "email"                 varchar(255)  NOT NULL,
        "password_hash"         varchar(255)  NOT NULL,
        "clinic_name"           varchar(255),
        "doctor_name"           varchar(255)  NOT NULL,
        "display_name"          varchar(255),
        "whatsapp"              varchar(20),
        "bio"                   text,
        "tags"                  jsonb,
        "google_location"       jsonb,
        "signup_id"             varchar(50),
        "user_type"             varchar(20)   NOT NULL DEFAULT 'doctor',
        "is_approved"           boolean       NOT NULL DEFAULT false,
        "is_admin"              boolean       NOT NULL DEFAULT false,
        "email_unsubscribed"    boolean       NOT NULL DEFAULT false,
        "email_unsubscribed_at" timestamp,
        "profile_photo_url"     varchar(500),
        "consent_flag"          boolean       NOT NULL DEFAULT false,
        "consent_at"            timestamp,
        "approved_at"           timestamp,
        "google_id"             varchar(255),
        "is_google_user"        boolean       NOT NULL DEFAULT false,
        "google_email_verified" boolean       NOT NULL DEFAULT false,
        "tier"                  varchar(50)   NOT NULL DEFAULT 'Lead Starter',
        "tier_color"            varchar(50),
        "base_tier"             varchar(50),
        "tier_progress"         decimal(10,2) NOT NULL DEFAULT 0,
        "current_sales"         decimal(10,2) NOT NULL DEFAULT 0,
        "custom_debt_limit"     decimal(12,2),
        "admin_debt_override"   boolean       NOT NULL DEFAULT false,
        "total_owed_amount"     decimal(12,2) NOT NULL DEFAULT 0,
        "debt_limit_exceeded"   boolean       NOT NULL DEFAULT false,
        "created_at"            timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"            timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_doctors" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctors_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_doctors_email" ON "doctors" ("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_doctors_doctor_id" ON "doctors" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_doctors_signup_id" ON "doctors" ("signup_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_doctors_is_approved" ON "doctors" ("is_approved")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_doctors_is_admin" ON "doctors" ("is_admin")`);

    // Auto-generate doctor_id trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generate_doctor_id()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.doctor_id IS NULL THEN
          NEW.doctor_id = nextval('doctor_id_seq');
        END IF;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'generate_doctor_id_trigger'
        ) THEN
          CREATE TRIGGER generate_doctor_id_trigger
            BEFORE INSERT ON "doctors"
            FOR EACH ROW EXECUTE FUNCTION generate_doctor_id();
        END IF;
      END $$;
    `);

    // products
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id"             uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "slot_index"     integer       NOT NULL,
        "image_url"      varchar(500),
        "name"           varchar(255)  NOT NULL,
        "description"    text,
        "price"          decimal(10,2),
        "is_visible"     boolean       NOT NULL DEFAULT true,
        "category"       varchar(50),
        "unit"           varchar(20),
        "stock_quantity" integer       NOT NULL DEFAULT 0,
        "is_featured"    boolean       NOT NULL DEFAULT false,
        "created_at"     timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"     timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_products" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_slot_index" UNIQUE ("slot_index"),
        CONSTRAINT "CHK_products_slot_index" CHECK ("slot_index" >= 1 AND "slot_index" <= 100)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_slot_index" ON "products" ("slot_index")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_is_visible" ON "products" ("is_visible")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_is_featured" ON "products" ("is_featured")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_category" ON "products" ("category")`);

    // orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id"                    uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "order_number"          varchar(50)   NOT NULL,
        "doctor_id"             uuid          NOT NULL,
        "product_id"            uuid          NOT NULL,
        "qty"                   integer       NOT NULL,
        "order_location"        jsonb         NOT NULL,
        "order_total"           decimal(10,2) NOT NULL,
        "status"                varchar(50)   NOT NULL DEFAULT 'pending',
        "payment_status"        varchar(50)             DEFAULT 'pending',
        "payment_method"        varchar(50),
        "payment_reference"     varchar(255),
        "payment_date"          timestamp,
        "payment_transaction_id" varchar(255),
        "payment_amount"        decimal(10,2),
        "payment_completed_at"  timestamp,
        "notes"                 text,
        "accepted_at"           timestamp,
        "completed_at"          timestamp,
        "cancelled_at"          timestamp,
        "cancelled_reason"      varchar(255),
        "assigned_employee_id"  uuid,
        "delivery_status"       varchar(50)   NOT NULL DEFAULT 'pending',
        "delivery_assigned_at"  timestamp,
        "delivery_started_at"   timestamp,
        "delivery_completed_at" timestamp,
        "delivery_location"     jsonb,
        "created_at"            timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"            timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_orders_order_number" UNIQUE ("order_number"),
        CONSTRAINT "FK_orders_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_order_number" ON "orders" ("order_number")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_doctor_id" ON "orders" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_product_id" ON "orders" ("product_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_status" ON "orders" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_created_at" ON "orders" ("created_at")`);

    // Auto-generate order_number trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generate_order_number()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.order_number IS NULL THEN
          NEW.order_number = 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
        END IF;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'generate_order_number_trigger'
        ) THEN
          CREATE TRIGGER generate_order_number_trigger
            BEFORE INSERT ON "orders"
            FOR EACH ROW EXECUTE FUNCTION generate_order_number();
        END IF;
      END $$;
    `);

    // research_papers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_papers" (
        "id"               uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"        uuid          NOT NULL,
        "title"            varchar(255)  NOT NULL,
        "abstract"         text          NOT NULL,
        "content"          text          NOT NULL,
        "citations"        jsonb         NOT NULL DEFAULT '[]',
        "image_urls"       varchar(500)[]          DEFAULT '{}',
        "tags"             varchar(500)[]          DEFAULT '{}',
        "pdf_file_url"     varchar(500),
        "pdf_file_name"    varchar(255),
        "is_approved"      boolean       NOT NULL DEFAULT false,
        "view_count"       integer       NOT NULL DEFAULT 0,
        "upvote_count"     integer       NOT NULL DEFAULT 0,
        "approved_at"      timestamp,
        "approved_by"      uuid,
        "rejection_reason" text,
        "created_at"       timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"       timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_research_papers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_research_papers_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_papers_doctor_id" ON "research_papers" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_papers_is_approved" ON "research_papers" ("is_approved")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_papers_created_at" ON "research_papers" ("created_at")`);

    // notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id"             uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "recipient_id"   uuid        NOT NULL,
        "type"           varchar(50) NOT NULL,
        "payload"        jsonb       NOT NULL,
        "is_sent"        boolean     NOT NULL DEFAULT false,
        "is_read"        boolean     NOT NULL DEFAULT false,
        "email_sent"     boolean     NOT NULL DEFAULT false,
        "whatsapp_sent"  boolean     NOT NULL DEFAULT false,
        "sent_at"        timestamp,
        "error_message"  text,
        "retry_count"    integer     NOT NULL DEFAULT 0,
        "created_at"     timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"     timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_recipient_id" ON "notifications" ("recipient_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_type" ON "notifications" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_is_sent" ON "notifications" ("is_sent")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_created_at" ON "notifications" ("created_at")`);

    // leaderboard_snapshots
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leaderboard_snapshots" (
        "id"             uuid           NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"      uuid           NOT NULL,
        "snapshot_date"  date           NOT NULL,
        "tier"           varchar(50)    NOT NULL,
        "current_sales"  decimal(12,2)  NOT NULL,
        "rank"           integer        NOT NULL,
        "total_doctors"  integer        NOT NULL,
        "previous_sales" decimal(12,2),
        "previous_tier"  varchar(50),
        "previous_rank"  integer,
        "created_at"     timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_leaderboard_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_leaderboard_snapshots_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leaderboard_snapshots_doctor_id" ON "leaderboard_snapshots" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leaderboard_snapshots_snapshot_date" ON "leaderboard_snapshots" ("snapshot_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leaderboard_snapshots_tier" ON "leaderboard_snapshots" ("tier")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leaderboard_snapshots_rank" ON "leaderboard_snapshots" ("rank")`);

    // allowed_signup_ids
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "allowed_signup_ids" (
        "id"            uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "signup_id"     varchar(50)  NOT NULL,
        "is_used"       boolean      NOT NULL DEFAULT false,
        "used_by_email" varchar(255),
        "used_at"       timestamp,
        "notes"         text,
        "created_at"    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_allowed_signup_ids" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_allowed_signup_ids_signup_id" UNIQUE ("signup_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_allowed_signup_ids_signup_id" ON "allowed_signup_ids" ("signup_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_allowed_signup_ids_is_used" ON "allowed_signup_ids" ("is_used")`);

    // hall_of_pride
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hall_of_pride" (
        "id"               uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"        uuid         NOT NULL,
        "title"            varchar(255) NOT NULL,
        "description"      text         NOT NULL,
        "image_url"        varchar(500),
        "achievement_type" varchar(100) NOT NULL,
        "reason"           varchar(255),
        "is_active"        boolean      NOT NULL DEFAULT true,
        "display_order"    integer      NOT NULL DEFAULT 0,
        "created_by_admin" uuid,
        "created_at"       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_hall_of_pride" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hall_of_pride_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_hall_of_pride_doctor_id" ON "hall_of_pride" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_hall_of_pride_is_active" ON "hall_of_pride" ("is_active")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_hall_of_pride_display_order" ON "hall_of_pride" ("display_order")`);

    // ------------------------------------------------------------------
    // 5. ADDITIONAL TABLES (not covered by any numbered migration)
    // ------------------------------------------------------------------

    // tier_configs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tier_configs" (
        "id"                   uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "name"                 varchar(100)  NOT NULL,
        "threshold"            decimal(12,2) NOT NULL,
        "color"                varchar(50)   NOT NULL,
        "description"          text          NOT NULL,
        "benefits"             text          NOT NULL,
        "icon"                 varchar(10)   NOT NULL,
        "display_order"        integer       NOT NULL DEFAULT 0,
        "is_active"            boolean       NOT NULL DEFAULT true,
        "debt_limit"           decimal(12,2),
        "achievement_message"  text,
        "progress_message_25"  text,
        "progress_message_50"  text,
        "progress_message_75"  text,
        "progress_message_90"  text,
        "max_tier_message"     text,
        "created_at"           timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"           timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_tier_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tier_configs_name" UNIQUE ("name")
      )
    `);

    // payfast_itn_notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payfast_itn_notifications" (
        "id"                uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "m_payment_id"      varchar(100),
        "pf_payment_id"     varchar(50),
        "payment_status"    varchar(20),
        "item_name"         varchar(100),
        "item_description"  varchar(255),
        "amount_gross"      decimal(10,2),
        "amount_fee"        decimal(10,2),
        "amount_net"        decimal(10,2),
        "custom_str1"       varchar(255),
        "custom_str2"       varchar(255),
        "custom_str3"       varchar(255),
        "custom_str4"       varchar(255),
        "custom_str5"       varchar(255),
        "custom_int1"       integer,
        "custom_int2"       integer,
        "custom_int3"       integer,
        "custom_int4"       integer,
        "custom_int5"       integer,
        "name_first"        varchar(100),
        "name_last"         varchar(100),
        "email_address"     varchar(100),
        "merchant_id"       varchar(20),
        "token"             varchar(36),
        "billing_date"      date,
        "signature"         varchar(50),
        "raw_payload"       jsonb,
        "status"            varchar(20)   NOT NULL DEFAULT 'received',
        "processing_notes"  text,
        "created_at"        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_payfast_itn_notifications" PRIMARY KEY ("id")
      )
    `);

    // admin_permissions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_permissions" (
        "id"              uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"       uuid        NOT NULL,
        "permission_type" varchar(20) NOT NULL DEFAULT 'viewer',
        "permissions"     jsonb       NOT NULL DEFAULT '{}',
        "granted_by"      uuid        NOT NULL,
        "expires_at"      timestamp,
        "is_active"       boolean     NOT NULL DEFAULT true,
        "notes"           text,
        "created_at"      timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"      timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_admin_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_permissions_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_admin_permissions_granted_by" FOREIGN KEY ("granted_by") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_admin_permissions_doctor_id" ON "admin_permissions" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_admin_permissions_permission_type" ON "admin_permissions" ("permission_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_admin_permissions_is_active" ON "admin_permissions" ("is_active")`);

    // research_paper_views
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_paper_views" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "research_paper_id" uuid        NOT NULL,
        "doctor_id"         uuid,
        "ip_address"        varchar(45),
        "user_agent"        text,
        "created_at"        timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_research_paper_views" PRIMARY KEY ("id"),
        CONSTRAINT "FK_research_paper_views_paper" FOREIGN KEY ("research_paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_paper_views_paper_id" ON "research_paper_views" ("research_paper_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_paper_views_doctor_id" ON "research_paper_views" ("doctor_id")`);

    // research_paper_upvotes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_paper_upvotes" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "research_paper_id" uuid        NOT NULL,
        "doctor_id"         uuid        NOT NULL,
        "ip_address"        varchar(45),
        "user_agent"        text,
        "created_at"        timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_research_paper_upvotes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_research_paper_upvotes" UNIQUE ("research_paper_id", "doctor_id"),
        CONSTRAINT "FK_research_paper_upvotes_paper" FOREIGN KEY ("research_paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_research_paper_upvotes_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_paper_upvotes_paper_id" ON "research_paper_upvotes" ("research_paper_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_paper_upvotes_doctor_id" ON "research_paper_upvotes" ("doctor_id")`);

    // research_benefit_configs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_benefit_configs" (
        "id"                      uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "title"                   varchar(255)  NOT NULL,
        "description"             text,
        "approval_threshold"      integer       NOT NULL,
        "approval_threshold_max"  integer,
        "view_threshold"          integer,
        "benefit_type"            varchar(50)   NOT NULL,
        "benefit_value"           decimal(5,2)  NOT NULL DEFAULT 0,
        "gift_description"        varchar(255),
        "is_active"               boolean       NOT NULL DEFAULT true,
        "sort_order"              integer       NOT NULL DEFAULT 0,
        "display_color"           varchar(50)   NOT NULL DEFAULT '#4F46E5',
        "max_awards_per_doctor"   integer       NOT NULL DEFAULT 1,
        "cooldown_days"           integer       NOT NULL DEFAULT 0,
        "requires_manual_approval" boolean      NOT NULL DEFAULT false,
        "created_at"              timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"              timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_research_benefit_configs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_benefit_configs_threshold" ON "research_benefit_configs" ("approval_threshold")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_benefit_configs_is_active" ON "research_benefit_configs" ("is_active")`);

    // research_benefits
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_benefits" (
        "id"                uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"         uuid         NOT NULL,
        "research_paper_id" uuid         NOT NULL,
        "benefit_type"      varchar(50)  NOT NULL,
        "benefit_value"     decimal(5,2) NOT NULL DEFAULT 0,
        "gift_description"  varchar(255),
        "is_claimed"        boolean      NOT NULL DEFAULT false,
        "claimed_at"        timestamp,
        "created_at"        timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"        timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_research_benefits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_research_benefits_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_research_benefits_paper" FOREIGN KEY ("research_paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_benefits_doctor_id" ON "research_benefits" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_benefits_paper_id" ON "research_benefits" ("research_paper_id")`);

    // research_reward_eligibility
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_reward_eligibility" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"         uuid        NOT NULL,
        "benefit_config_id" uuid        NOT NULL,
        "research_paper_id" uuid,
        "approval_count"    integer     NOT NULL,
        "is_eligible"       boolean     NOT NULL DEFAULT true,
        "status"            varchar(20) NOT NULL DEFAULT 'eligible',
        "delivered_at"      timestamp,
        "delivered_by"      uuid,
        "notes"             text,
        "created_at"        timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"        timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_research_reward_eligibility" PRIMARY KEY ("id"),
        CONSTRAINT "FK_research_reward_eligibility_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_research_reward_eligibility_config" FOREIGN KEY ("benefit_config_id") REFERENCES "research_benefit_configs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_reward_eligibility_doctor_id" ON "research_reward_eligibility" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_reward_eligibility_status" ON "research_reward_eligibility" ("status")`);

    // research_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_reports" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "research_paper_id" uuid        NOT NULL,
        "reporter_id"       uuid        NOT NULL,
        "report_type"       varchar(50) NOT NULL,
        "description"       text        NOT NULL,
        "admin_notes"       text,
        "status"            varchar(20) NOT NULL DEFAULT 'pending',
        "reviewed_by"       uuid,
        "reviewed_at"       timestamp,
        "ip_address"        varchar(255),
        "user_agent"        text,
        "created_at"        timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"        timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_research_reports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_research_reports_paper" FOREIGN KEY ("research_paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_research_reports_reporter" FOREIGN KEY ("reporter_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_reports_paper_id" ON "research_reports" ("research_paper_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_reports_reporter_id" ON "research_reports" ("reporter_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_research_reports_status" ON "research_reports" ("status")`);

    // research_settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_settings" (
        "id"            uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "setting_key"   varchar(100) NOT NULL,
        "setting_value" text         NOT NULL,
        "description"   varchar(255),
        "created_at"    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_research_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_research_settings_key" UNIQUE ("setting_key")
      )
    `);

    // certificates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "certificates" (
        "id"                uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"         uuid         NOT NULL,
        "certificate_type"  varchar(50)  NOT NULL,
        "title"             varchar(200) NOT NULL,
        "subtitle"          text,
        "description"       text         NOT NULL,
        "achievement"       varchar(100),
        "tier_name"         varchar(50),
        "rank"              integer,
        "month"             varchar(20),
        "year"              integer,
        "status"            varchar(20)  NOT NULL DEFAULT 'issued',
        "issued_at"         timestamp,
        "verified_at"       timestamp,
        "expires_at"        timestamp,
        "certificate_url"   varchar(500),
        "verification_code" varchar(500),
        "metadata"          text,
        "created_at"        timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"        timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_certificates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_certificates_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_certificates_doctor_id" ON "certificates" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_certificates_type" ON "certificates" ("certificate_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_certificates_status" ON "certificates" ("status")`);

    // badges
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "badges" (
        "id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"   uuid         NOT NULL,
        "name"        varchar(100) NOT NULL,
        "badge_type"  varchar(20)  NOT NULL DEFAULT 'achievement',
        "description" text         NOT NULL,
        "icon"        varchar(10)  NOT NULL DEFAULT '🏅',
        "color"       varchar(50)  NOT NULL DEFAULT 'blue',
        "earned_date" timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_active"   boolean      NOT NULL DEFAULT true,
        "assigned_by" uuid,
        "notes"       text,
        "created_at"  timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"  timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_badges" PRIMARY KEY ("id"),
        CONSTRAINT "FK_badges_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_badges_doctor_id" ON "badges" ("doctor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_badges_badge_type" ON "badges" ("badge_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_badges_is_active" ON "badges" ("is_active")`);

    // debt_thresholds
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "debt_thresholds" (
        "id"          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "tier_name"   varchar(100)  NOT NULL,
        "debt_limit"  decimal(12,2) NOT NULL,
        "description" text,
        "is_active"   boolean       NOT NULL DEFAULT true,
        "created_at"  timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"  timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_debt_thresholds" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_debt_thresholds_tier_name" UNIQUE ("tier_name")
      )
    `);

    // video_advertisements
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "video_advertisements" (
        "id"                    uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"             uuid          NOT NULL,
        "title"                 varchar(255)  NOT NULL,
        "description"           text,
        "type"                  varchar(50)   NOT NULL,
        "video_url"             text,
        "image_url"             text,
        "thumbnail_url"         text,
        "content"               text,
        "selected_area"         varchar(100)  NOT NULL,
        "duration_hours"        integer       NOT NULL,
        "start_date"            timestamp,
        "end_date"              timestamp,
        "pause_until"           timestamp,
        "status"                varchar(50)   NOT NULL DEFAULT 'pending',
        "payment_status"        varchar(50)   NOT NULL DEFAULT 'pending',
        "payment_method"        varchar(50),
        "total_cost"            decimal(10,2) NOT NULL DEFAULT 0,
        "paid_amount"           decimal(10,2) NOT NULL DEFAULT 0,
        "payment_date"          timestamp,
        "transaction_id"        varchar(255),
        "rejection_reason"      text,
        "admin_notes"           text,
        "impressions"           integer       NOT NULL DEFAULT 0,
        "clicks"                integer       NOT NULL DEFAULT 0,
        "views"                 integer       NOT NULL DEFAULT 0,
        "is_quitable"           boolean       NOT NULL DEFAULT true,
        "is_closed_by_user"     boolean       NOT NULL DEFAULT false,
        "audio_enabled"         boolean       NOT NULL DEFAULT false,
        "slides"                jsonb,
        "slide_count"           integer                DEFAULT 1,
        "slide_interval_seconds" integer               DEFAULT 5,
        "auto_slide_enabled"    boolean                DEFAULT true,
        "created_at"            timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"            timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_video_advertisements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_video_advertisements_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    // advertisement_area_configs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "advertisement_area_configs" (
        "id"                          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "area_name"                   varchar(100)  NOT NULL,
        "display_name"                varchar(255)  NOT NULL,
        "description"                 text,
        "device_type"                 varchar(20)   NOT NULL,
        "position"                    varchar(100)  NOT NULL,
        "dimensions"                  json          NOT NULL,
        "responsive_breakpoints"      json,
        "styles"                      json,
        "base_hourly_rate"            decimal(10,2) NOT NULL,
        "pricing_tiers"               json,
        "max_concurrent_ads"          integer       NOT NULL DEFAULT 1,
        "current_active_ads"          integer       NOT NULL DEFAULT 0,
        "total_ads_served"            integer       NOT NULL DEFAULT 0,
        "allowed_content_types"       json,
        "max_file_size_mb"            integer,
        "max_duration_seconds"        integer,
        "allowed_formats"             json,
        "visible_to_guests"           boolean       NOT NULL DEFAULT true,
        "visible_to_authenticated"    boolean       NOT NULL DEFAULT true,
        "allow_user_selection"        boolean       NOT NULL DEFAULT true,
        "ads_closeable"               boolean       NOT NULL DEFAULT true,
        "display_type"                varchar(50)   NOT NULL DEFAULT 'simple',
        "is_active"                   boolean       NOT NULL DEFAULT true,
        "priority"                    integer       NOT NULL DEFAULT 0,
        "admin_notes"                 text,
        "preview_image_url"           text,
        "rotation_interval_seconds"   integer       NOT NULL DEFAULT 5,
        "auto_rotation_enabled"       boolean       NOT NULL DEFAULT true,
        "average_ctr"                 decimal(10,2) NOT NULL DEFAULT 0,
        "average_cpm"                 decimal(10,2) NOT NULL DEFAULT 0,
        "audio_enabled_price_multiplier" decimal(10,2) NOT NULL DEFAULT 1.5,
        "total_impressions"           integer       NOT NULL DEFAULT 0,
        "total_clicks"                integer       NOT NULL DEFAULT 0,
        "created_at"                  timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"                  timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_advertisement_area_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_advertisement_area_configs_area_name" UNIQUE ("area_name")
      )
    `);

    // advertisement_rotation_configs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "advertisement_rotation_configs" (
        "id"                        uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "area_name"                 varchar(100) NOT NULL,
        "rotation_interval_seconds" integer      NOT NULL DEFAULT 5,
        "max_concurrent_ads"        integer      NOT NULL DEFAULT 1,
        "auto_rotation_enabled"     boolean      NOT NULL DEFAULT true,
        "is_active"                 boolean      NOT NULL DEFAULT true,
        "admin_notes"               text,
        "created_at"                timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"                timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_advertisement_rotation_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_advertisement_rotation_configs_area_name" UNIQUE ("area_name")
      )
    `);

    // auto_email_configs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auto_email_configs" (
        "id"             uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "config_id"      varchar(255) NOT NULL DEFAULT 'auto-email-config',
        "subject"        varchar(500) NOT NULL,
        "content"        text         NOT NULL,
        "duration_hours" integer      NOT NULL,
        "enabled"        boolean      NOT NULL DEFAULT false,
        "last_sent"      timestamp,
        "next_send"      timestamp,
        "created_at"     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_auto_email_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auto_email_configs_config_id" UNIQUE ("config_id")
      )
    `);

    // email_deliveries
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_deliveries" (
        "id"             uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "recipient_id"   uuid,
        "recipient_email" varchar(255) NOT NULL,
        "subject"        varchar(500) NOT NULL,
        "status"         varchar(20)  NOT NULL DEFAULT 'pending',
        "email_type"     varchar(20)  NOT NULL DEFAULT 'marketing',
        "retry_count"    integer      NOT NULL DEFAULT 0,
        "sent_at"        timestamp,
        "delivered_at"   timestamp,
        "bounced_at"     timestamp,
        "failed_at"      timestamp,
        "error_message"  text,
        "bounce_reason"  text,
        "is_opened"      boolean      NOT NULL DEFAULT false,
        "opened_at"      timestamp,
        "is_clicked"     boolean      NOT NULL DEFAULT false,
        "clicked_at"     timestamp,
        "campaign_id"    varchar(255),
        "created_at"     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_email_deliveries" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_recipient_id" ON "email_deliveries" ("recipient_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_status" ON "email_deliveries" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_email_type" ON "email_deliveries" ("email_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_deliveries_created_at" ON "email_deliveries" ("created_at")`);

    // advertisement_pricing_configs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "advertisement_pricing_configs" (
        "id"               uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "placement_area"   varchar(100)  NOT NULL,
        "advertisement_type" varchar(50) NOT NULL,
        "duration_unit"    varchar(20)   NOT NULL,
        "is_quitable"      boolean       NOT NULL DEFAULT true,
        "unit_price"       decimal(10,2) NOT NULL,
        "is_active"        boolean       NOT NULL DEFAULT true,
        "description"      text,
        "created_at"       timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"       timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_advertisement_pricing_configs" PRIMARY KEY ("id")
      )
    `);

    // otp_configs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_configs" (
        "userType"     varchar(50)  NOT NULL,
        "duration"     integer      NOT NULL DEFAULT 24,
        "durationType" varchar(20)  NOT NULL DEFAULT 'hours',
        "isRequired"   boolean      NOT NULL DEFAULT false,
        "description"  text,
        "created_at"   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_otp_configs" PRIMARY KEY ("userType")
      )
    `);

    // ------------------------------------------------------------------
    // 6. updated_at TRIGGER FUNCTION (shared)
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse FK dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "advertisement_pricing_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_deliveries" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auto_email_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "advertisement_rotation_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "advertisement_area_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "video_advertisements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "debt_thresholds" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "badges" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certificates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_reward_eligibility" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_benefits" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_benefit_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_paper_upvotes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_paper_views" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_permissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payfast_itn_notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tier_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hall_of_pride" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "allowed_signup_ids" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leaderboard_snapshots" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_papers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctors" CASCADE`);

    // Drop sequences
    await queryRunner.query(`DROP SEQUENCE IF EXISTS order_number_seq`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS doctor_id_seq`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS email_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS email_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS badge_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS certificate_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS certificate_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS report_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS report_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reward_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS benefit_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS admin_permission_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS delivery_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_type_enum`);
  }
}
