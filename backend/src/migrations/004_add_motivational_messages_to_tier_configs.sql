-- Add motivational message columns to tier_configs table
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS achievement_message TEXT;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS progress_message_25 TEXT;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS progress_message_50 TEXT;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS progress_message_75 TEXT;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS progress_message_90 TEXT;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS max_tier_message TEXT;

-- Set default motivational messages for existing tiers
UPDATE tier_configs SET 
  achievement_message = '🎉 Congratulations! You''ve achieved the ' || name || ' tier!',
  progress_message_25 = '⭐ Great start! Every order brings you closer to the next tier!',
  progress_message_50 = '🚀 Halfway there! Your dedication is paying off!',
  progress_message_75 = '💪 You''re making great progress! Keep it up!',
  progress_message_90 = '🔥 So close! Just a few more orders to reach the next tier!',
  max_tier_message = '🎉 Congratulations! You''ve achieved your current tier!'
WHERE achievement_message IS NULL;
