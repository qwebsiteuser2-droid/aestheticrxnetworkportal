-- Seed script for Railway database
-- This will create initial admin users, signup IDs, and sample products

-- ============================================================================
-- 1. SEED ADMIN USERS
-- ============================================================================
-- Note: Replace 'asadkhanbloch4949@gmail.com' with your actual admin email from Railway variables

-- Check if admins exist
DO $$
DECLARE
    admin_count INTEGER;
    main_admin_email TEXT := 'asadkhanbloch4949@gmail.com'; -- Update this with MAIN_ADMIN_EMAIL from Railway
    secondary_admin_email TEXT := 'asadkhanbloch4949@gmail.com'; -- Update this with SECONDARY_ADMIN_EMAIL from Railway
    password_hash TEXT := '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5'; -- Hash for 'Qasim7878,,'
BEGIN
    SELECT COUNT(*) INTO admin_count FROM doctors WHERE is_admin = true;
    
    IF admin_count = 0 THEN
        -- Insert main admin
        INSERT INTO doctors (
            id, email, password_hash, clinic_name, doctor_name, 
            whatsapp, signup_id, is_approved, is_admin, consent_flag, 
            consent_at, approved_at, doctor_id, user_type, is_deactivated
        ) VALUES (
            gen_random_uuid(),
            main_admin_email,
            password_hash,
            'Main Admin Clinic',
            'Main Administrator',
            '+1234567890',
            'ADMIN_MAIN',
            true,
            true,
            true,
            NOW(),
            NOW(),
            42000,
            'doctor',
            false
        ) ON CONFLICT (email) DO NOTHING;

        -- Insert secondary admin (use different email if same)
        INSERT INTO doctors (
            id, email, password_hash, clinic_name, doctor_name, 
            whatsapp, signup_id, is_approved, is_admin, consent_flag, 
            consent_at, approved_at, doctor_id, user_type, is_deactivated
        ) VALUES (
            gen_random_uuid(),
            CASE 
                WHEN secondary_admin_email = main_admin_email 
                THEN REPLACE(secondary_admin_email, '@', '+admin2@')
                ELSE secondary_admin_email
            END,
            password_hash,
            'Secondary Admin Clinic',
            'Secondary Administrator',
            '+1234567891',
            'ADMIN_SECONDARY',
            true,
            true,
            true,
            NOW(),
            NOW(),
            41999,
            'doctor',
            false
        ) ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Admin users created';
    ELSE
        RAISE NOTICE 'Admin users already exist, skipping...';
    END IF;
END $$;

-- ============================================================================
-- 2. SEED ALLOWED SIGNUP IDS
-- ============================================================================
INSERT INTO allowed_signup_ids (id, signup_id, is_used, notes)
SELECT 
    gen_random_uuid(),
    i::text,
    false,
    'Auto-generated signup ID ' || i
FROM generate_series(42001, 42030) AS i
ON CONFLICT (signup_id) DO NOTHING;

-- ============================================================================
-- 3. SEED SAMPLE PRODUCTS
-- ============================================================================
INSERT INTO products (
    id, slot_index, name, description, price, category, unit, 
    stock_quantity, is_featured, is_visible
)
SELECT * FROM (VALUES
    (gen_random_uuid(), 1, 'Medical Gloves - Latex Free', 'High-quality latex-free medical gloves for safe patient care. Powder-free, ambidextrous design.', 25.99, 'Protective Equipment', 'box (100 pieces)', 50, true, true),
    (gen_random_uuid(), 2, 'Surgical Masks - N95', 'NIOSH-approved N95 surgical masks with 95% filtration efficiency. Comfortable fit for extended wear.', 45.50, 'Protective Equipment', 'box (20 pieces)', 30, true, true),
    (gen_random_uuid(), 3, 'Digital Thermometer', 'Fast and accurate digital thermometer with large display. Waterproof design for easy cleaning.', 15.75, 'Diagnostic Equipment', 'piece', 25, false, true),
    (gen_random_uuid(), 4, 'Blood Pressure Monitor', 'Automatic blood pressure monitor with large cuff. Memory function for multiple users.', 89.99, 'Diagnostic Equipment', 'piece', 15, true, true),
    (gen_random_uuid(), 5, 'Stethoscope - Professional', 'High-quality stethoscope with excellent acoustic performance. Lightweight and durable.', 125.00, 'Diagnostic Equipment', 'piece', 20, false, true),
    (gen_random_uuid(), 6, 'First Aid Kit - Complete', 'Comprehensive first aid kit with all essential medical supplies. Portable and organized.', 75.25, 'Emergency Supplies', 'kit', 10, false, true)
) AS v(id, slot_index, name, description, price, category, unit, stock_quantity, is_featured, is_visible)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.slot_index = v.slot_index)
ON CONFLICT (slot_index) DO NOTHING;

-- ============================================================================
-- VERIFY DATA
-- ============================================================================
SELECT 'Doctors (admins):' as info, COUNT(*) as count FROM doctors WHERE is_admin = true
UNION ALL
SELECT 'Allowed Signup IDs:', COUNT(*) FROM allowed_signup_ids
UNION ALL
SELECT 'Products:', COUNT(*) FROM products;

