-- Add tier_color column to doctors table
ALTER TABLE doctors ADD COLUMN tier_color VARCHAR(50);

-- Update existing doctors with their tier colors based on current tier
UPDATE doctors SET tier_color = 'gray' WHERE tier = 'Lead Starter';
UPDATE doctors SET tier_color = 'green' WHERE tier = 'Lead Contributor';
UPDATE doctors SET tier_color = 'blue' WHERE tier = 'Lead Expert';
UPDATE doctors SET tier_color = 'purple' WHERE tier = 'Grand Lead';
UPDATE doctors SET tier_color = 'red' WHERE tier = 'Elite Lead';
UPDATE doctors SET tier_color = 'orange' WHERE tier = 'Expert Contributor';

-- Set default tier_color for any remaining doctors
UPDATE doctors SET tier_color = 'gray' WHERE tier_color IS NULL;
