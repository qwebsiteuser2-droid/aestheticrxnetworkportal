-- Create tier_configs table
CREATE TABLE tier_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    threshold DECIMAL(12,2) NOT NULL,
    color VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    benefits TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for tier_configs table
CREATE INDEX idx_tier_configs_name ON tier_configs(name);
CREATE INDEX idx_tier_configs_threshold ON tier_configs(threshold);
CREATE INDEX idx_tier_configs_display_order ON tier_configs(display_order);
CREATE INDEX idx_tier_configs_is_active ON tier_configs(is_active);

-- Insert default tier configurations
INSERT INTO tier_configs (name, threshold, color, description, benefits, icon, display_order, is_active) VALUES
('Lead Starter', 0, 'gray', '0 – 99,999 PKR', 'Listed in system only.', '⚪', 1, true),
('Lead Contributor', 100000, 'green', '100,000 – 249,999 PKR', 'Name on leaderboard, basic badge.', '🟢', 2, true),
('Lead Expert', 250000, 'blue', '250,000 – 499,999 PKR', '5% discount + small gift pack.', '🔵', 3, true),
('Grand Lead', 500000, 'purple', '500,000 – 999,999 PKR', '10% discount + priority support + VIP badge.', '🟣', 4, true),
('Elite Lead', 1000000, 'red', '1,000,000+ PKR', '15% discount + free marketing ads (admin chooses), premium badge, homepage feature.', '🔴', 5, true);

-- Create trigger for updated_at
CREATE TRIGGER update_tier_configs_updated_at
    BEFORE UPDATE ON tier_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
