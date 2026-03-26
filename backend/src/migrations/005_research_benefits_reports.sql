-- Create research_benefits table
CREATE TABLE IF NOT EXISTS research_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    research_paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    benefit_type VARCHAR(50) NOT NULL CHECK (benefit_type IN ('gift', 'tier_progress', 'bonus_approvals')),
    benefit_value DECIMAL(5,2) DEFAULT 0,
    gift_description VARCHAR(255),
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create research_reports table
CREATE TABLE IF NOT EXISTS research_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    research_paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('plagiarism', 'misinformation', 'inappropriate_content', 'spam', 'other')),
    description TEXT NOT NULL,
    admin_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES doctors(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    ip_address VARCHAR(255),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_research_benefits_doctor_id ON research_benefits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_research_benefits_paper_id ON research_benefits(research_paper_id);
CREATE INDEX IF NOT EXISTS idx_research_benefits_type ON research_benefits(benefit_type);

CREATE INDEX IF NOT EXISTS idx_research_reports_paper_id ON research_reports(research_paper_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_reporter_id ON research_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_status ON research_reports(status);
CREATE INDEX IF NOT EXISTS idx_research_reports_type ON research_reports(report_type);

-- Update research_paper_views to allow null doctor_id for anonymous views
ALTER TABLE research_paper_views ALTER COLUMN doctor_id DROP NOT NULL;
