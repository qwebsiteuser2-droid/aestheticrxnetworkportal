-- Create research_benefit_configs table for configurable research benefits
CREATE TABLE IF NOT EXISTS research_benefit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    approval_threshold INTEGER NOT NULL,
    approval_threshold_max INTEGER,
    benefit_type VARCHAR(50) NOT NULL CHECK (benefit_type IN ('gift', 'tier_progress', 'bonus_approvals')),
    benefit_value DECIMAL(5,2) DEFAULT 0,
    gift_description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    display_color VARCHAR(50) DEFAULT '#4F46E5',
    max_awards_per_doctor INTEGER DEFAULT 1,
    cooldown_days INTEGER DEFAULT 0,
    requires_manual_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_research_benefit_configs_threshold ON research_benefit_configs(approval_threshold);
CREATE INDEX IF NOT EXISTS idx_research_benefit_configs_active ON research_benefit_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_research_benefit_configs_sort ON research_benefit_configs(sort_order);

-- Insert default benefit configurations (matching current hardcoded values)
INSERT INTO research_benefit_configs (
    title, description, approval_threshold, approval_threshold_max, 
    benefit_type, benefit_value, gift_description, sort_order, display_color
) VALUES 
(
    '20+ Approvals',
    'Monthly company gift for reaching 20 approvals',
    20, NULL,
    'gift', 1, 'Monthly company gift',
    1, '#10B981'
),
(
    '50+ Approvals', 
    '5% tier progress boost for reaching 50 approvals',
    50, NULL,
    'tier_progress', 5, NULL,
    2, '#3B82F6'
),
(
    '80-99 Approvals',
    '10% tier progress boost for reaching 80-99 approvals',
    80, 99,
    'tier_progress', 10, NULL,
    3, '#8B5CF6'
),
(
    '100+ Approvals',
    '15 bonus approvals for reaching 100 approvals',
    100, NULL,
    'bonus_approvals', 15, NULL,
    4, '#F59E0B'
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_research_benefit_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_research_benefit_configs_updated_at
    BEFORE UPDATE ON research_benefit_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_research_benefit_configs_updated_at();

