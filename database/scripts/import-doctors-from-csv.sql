-- Import doctors from CSV file
-- This script imports doctors using COPY command

\c bioaestheticax1

-- Create temporary table with same structure
CREATE TEMP TABLE doctors_temp (LIKE doctors INCLUDING ALL);

-- Copy data from CSV (will be provided via stdin or file)
-- Format: id, doctor_id, email, password_hash, clinic_name, doctor_name, whatsapp, google_location, signup_id, is_approved, is_admin, profile_photo_url, consent_flag, consent_at, approved_at, created_at, updated_at, tier, tier_progress, current_sales, base_tier, is_deactivated, bio, tags, display_name, custom_debt_limit, admin_debt_override, total_owed_amount, debt_limit_exceeded, tier_color, user_type, email_unsubscribed, email_unsubscribed_at

-- Note: This will be run with: railway connect postgres < import-doctors-from-csv.sql
-- And the CSV will be piped in separately

