-- Add debt_limit column to tier_configs table
ALTER TABLE tier_configs ADD COLUMN debt_limit DECIMAL(12,2) NULL;

-- Set default debt limits for existing tiers based on 10% of their threshold
UPDATE tier_configs 
SET debt_limit = GREATEST(50000, threshold * 0.1)
WHERE debt_limit IS NULL;
