-- Initial migration for AestheticRxNetwork database
-- This file contains the complete database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create doctors table
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id INTEGER UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    clinic_name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20),
    google_location JSONB,
    signup_id VARCHAR(50) UNIQUE NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    profile_photo_url VARCHAR(500),
    consent_flag BOOLEAN DEFAULT FALSE,
    consent_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for doctors table
CREATE INDEX idx_doctors_email ON doctors(email);
CREATE INDEX idx_doctors_doctor_id ON doctors(doctor_id);
CREATE INDEX idx_doctors_signup_id ON doctors(signup_id);
CREATE INDEX idx_doctors_is_approved ON doctors(is_approved);
CREATE INDEX idx_doctors_is_admin ON doctors(is_admin);

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_index INTEGER UNIQUE NOT NULL CHECK (slot_index >= 1 AND slot_index <= 100),
    image_url VARCHAR(500),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    is_visible BOOLEAN DEFAULT TRUE,
    category VARCHAR(50),
    unit VARCHAR(20),
    stock_quantity INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for products table
CREATE INDEX idx_products_slot_index ON products(slot_index);
CREATE INDEX idx_products_is_visible ON products(is_visible);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_category ON products(category);

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL CHECK (qty > 0),
    order_location JSONB NOT NULL,
    order_total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
    notes TEXT,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for orders table
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_doctor_id ON orders(doctor_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Create research_papers table
CREATE TABLE research_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    abstract TEXT NOT NULL,
    content TEXT NOT NULL,
    citations JSONB NOT NULL DEFAULT '[]',
    image_urls VARCHAR(500)[] DEFAULT '{}',
    tags VARCHAR(500)[] DEFAULT '{}',
    is_approved BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    upvote_count INTEGER DEFAULT 0,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES doctors(id),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for research_papers table
CREATE INDEX idx_research_papers_doctor_id ON research_papers(doctor_id);
CREATE INDEX idx_research_papers_is_approved ON research_papers(is_approved);
CREATE INDEX idx_research_papers_created_at ON research_papers(created_at);
CREATE INDEX idx_research_papers_view_count ON research_papers(view_count);
CREATE INDEX idx_research_papers_upvote_count ON research_papers(upvote_count);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'user_approved', 'user_rejected', 'order_placed', 'order_accepted',
        'order_completed', 'order_cancelled', 'tier_up', 'research_approved',
        'research_rejected', 'monthly_report', 'admin_alert'
    )),
    payload JSONB NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for notifications table
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_sent ON notifications(is_sent);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create leaderboard_snapshots table
CREATE TABLE leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    tier VARCHAR(50) NOT NULL,
    current_sales DECIMAL(12,2) NOT NULL,
    rank INTEGER NOT NULL,
    total_doctors INTEGER NOT NULL,
    previous_sales DECIMAL(12,2),
    previous_tier VARCHAR(50),
    previous_rank INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for leaderboard_snapshots table
CREATE INDEX idx_leaderboard_snapshots_doctor_id ON leaderboard_snapshots(doctor_id);
CREATE INDEX idx_leaderboard_snapshots_snapshot_date ON leaderboard_snapshots(snapshot_date);
CREATE INDEX idx_leaderboard_snapshots_tier ON leaderboard_snapshots(tier);
CREATE INDEX idx_leaderboard_snapshots_rank ON leaderboard_snapshots(rank);

-- Create allowed_signup_ids table
CREATE TABLE allowed_signup_ids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signup_id VARCHAR(50) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by_email VARCHAR(255),
    used_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for allowed_signup_ids table
CREATE INDEX idx_allowed_signup_ids_signup_id ON allowed_signup_ids(signup_id);
CREATE INDEX idx_allowed_signup_ids_is_used ON allowed_signup_ids(is_used);

-- Create hall_of_pride table
CREATE TABLE hall_of_pride (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(500),
    achievement_type VARCHAR(100) NOT NULL,
    reason VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_by_admin UUID REFERENCES doctors(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for hall_of_pride table
CREATE INDEX idx_hall_of_pride_doctor_id ON hall_of_pride(doctor_id);
CREATE INDEX idx_hall_of_pride_is_active ON hall_of_pride(is_active);
CREATE INDEX idx_hall_of_pride_display_order ON hall_of_pride(display_order);
CREATE INDEX idx_hall_of_pride_created_at ON hall_of_pride(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_research_papers_updated_at BEFORE UPDATE ON research_papers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hall_of_pride_updated_at BEFORE UPDATE ON hall_of_pride FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create sequence for doctor_id starting from 42001
CREATE SEQUENCE doctor_id_seq START 42001;

-- Create function to auto-generate doctor_id
CREATE OR REPLACE FUNCTION generate_doctor_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.doctor_id IS NULL THEN
        NEW.doctor_id = nextval('doctor_id_seq');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-generating doctor_id
CREATE TRIGGER generate_doctor_id_trigger 
    BEFORE INSERT ON doctors 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_doctor_id();

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number = 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for order numbers
CREATE SEQUENCE order_number_seq START 1;

-- Create trigger for auto-generating order numbers
CREATE TRIGGER generate_order_number_trigger 
    BEFORE INSERT ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_order_number();
