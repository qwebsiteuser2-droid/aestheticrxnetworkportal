-- Create research paper views tracking table
CREATE TABLE research_paper_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(research_paper_id, doctor_id)
);

-- Create research paper upvotes tracking table
CREATE TABLE research_paper_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(research_paper_id, doctor_id)
);

-- Create indexes for performance
CREATE INDEX idx_research_paper_views_research_paper_id ON research_paper_views(research_paper_id);
CREATE INDEX idx_research_paper_views_doctor_id ON research_paper_views(doctor_id);
CREATE INDEX idx_research_paper_views_created_at ON research_paper_views(created_at);

CREATE INDEX idx_research_paper_upvotes_research_paper_id ON research_paper_upvotes(research_paper_id);
CREATE INDEX idx_research_paper_upvotes_doctor_id ON research_paper_upvotes(doctor_id);
CREATE INDEX idx_research_paper_upvotes_created_at ON research_paper_upvotes(created_at);
