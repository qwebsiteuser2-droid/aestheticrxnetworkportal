-- Create video_advertisements table
CREATE TABLE IF NOT EXISTS "video_advertisements" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "doctor_id" uuid NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text,
  "type" character varying NOT NULL,
  "video_url" character varying(500),
  "thumbnail_url" character varying(500),
  "image_url" character varying(500),
  "duration_seconds" integer NOT NULL DEFAULT 5,
  "video_format" character varying(50),
  "file_size_mb" integer,
  "content" text,
  "target_url" character varying(500),
  "button_text" character varying(100),
  "button_color" character varying(7),
  "background_color" character varying(7),
  "text_color" character varying(7),
  "selected_area" character varying NOT NULL,
  "additional_areas" json,
  "hourly_rate" decimal(10,2) NOT NULL,
  "duration_type" character varying NOT NULL,
  "duration_value" integer NOT NULL,
  "total_cost" decimal(10,2) NOT NULL,
  "paid_amount" decimal(10,2) NOT NULL DEFAULT 0,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "start_time" time,
  "end_time" time,
  "status" character varying NOT NULL DEFAULT 'pending',
  "admin_notes" text,
  "rejection_reason" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "impressions" integer NOT NULL DEFAULT 0,
  "clicks" integer NOT NULL DEFAULT 0,
  "views" integer NOT NULL DEFAULT 0,
  "ctr" decimal(10,2) NOT NULL DEFAULT 0,
  "cpm" decimal(10,2) NOT NULL DEFAULT 0,
  "payment_method" character varying(100),
  "payment_status" character varying(100),
  "payment_date" timestamp,
  "transaction_id" character varying(200),
  "priority" integer NOT NULL DEFAULT 0,
  "targeting" json,
  "schedule" json,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_video_advertisements" PRIMARY KEY ("id")
);

-- Create advertisement_area_configs table
CREATE TABLE IF NOT EXISTS "advertisement_area_configs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "area_name" character varying NOT NULL UNIQUE,
  "display_name" character varying(255) NOT NULL,
  "description" text,
  "device_type" character varying NOT NULL,
  "position" character varying(100) NOT NULL,
  "dimensions" json NOT NULL,
  "responsive_breakpoints" json,
  "styles" json,
  "base_hourly_rate" decimal(10,2) NOT NULL,
  "pricing_tiers" json,
  "max_concurrent_ads" integer NOT NULL DEFAULT 1,
  "current_active_ads" integer NOT NULL DEFAULT 0,
  "total_ads_served" integer NOT NULL DEFAULT 0,
  "allowed_content_types" json,
  "max_file_size_mb" integer,
  "max_duration_seconds" integer,
  "allowed_formats" json,
  "visible_to_guests" boolean NOT NULL DEFAULT true,
  "visible_to_authenticated" boolean NOT NULL DEFAULT true,
  "allow_user_selection" boolean NOT NULL DEFAULT true,
  "is_active" boolean NOT NULL DEFAULT true,
  "priority" integer NOT NULL DEFAULT 0,
  "admin_notes" text,
  "average_ctr" decimal(10,2) NOT NULL DEFAULT 0,
  "average_cpm" decimal(10,2) NOT NULL DEFAULT 0,
  "total_impressions" integer NOT NULL DEFAULT 0,
  "total_clicks" integer NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_advertisement_area_configs" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "video_advertisements" 
ADD CONSTRAINT "FK_video_advertisements_doctor_id" 
FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX "IDX_video_advertisements_doctor_id" ON "video_advertisements" ("doctor_id");
CREATE INDEX "IDX_video_advertisements_status" ON "video_advertisements" ("status");
CREATE INDEX "IDX_video_advertisements_selected_area" ON "video_advertisements" ("selected_area");
CREATE INDEX "IDX_video_advertisements_start_date" ON "video_advertisements" ("start_date");
CREATE INDEX "IDX_video_advertisements_end_date" ON "video_advertisements" ("end_date");
CREATE INDEX "IDX_video_advertisements_is_active" ON "video_advertisements" ("is_active");

CREATE INDEX "IDX_advertisement_area_configs_area_name" ON "advertisement_area_configs" ("area_name");
CREATE INDEX "IDX_advertisement_area_configs_device_type" ON "advertisement_area_configs" ("device_type");
CREATE INDEX "IDX_advertisement_area_configs_is_active" ON "advertisement_area_configs" ("is_active");

-- Insert default advertisement area configurations
INSERT INTO "advertisement_area_configs" (
  "area_name", "display_name", "description", "device_type", "position", 
  "dimensions", "base_hourly_rate", "allowed_content_types", "max_file_size_mb", 
  "max_duration_seconds", "allowed_formats", "priority"
) VALUES 
-- Desktop Areas
('desktop_header_banner', 'Desktop Header Banner', 'Large banner at the top of desktop pages', 'desktop', 'top', 
 '{"width": 1200, "height": 200, "min_width": 800, "max_width": 1400}', 50.00, 
 '["video", "image", "animation"]', 10, 5, '["mp4", "webm", "jpg", "png", "gif"]', 10),

('desktop_sidebar_top', 'Desktop Sidebar Top', 'Top position in desktop sidebar', 'desktop', 'sidebar', 
 '{"width": 300, "height": 250, "min_width": 250, "max_width": 350}', 30.00, 
 '["video", "image", "animation"]', 8, 5, '["mp4", "webm", "jpg", "png", "gif"]', 8),

('desktop_sidebar_bottom', 'Desktop Sidebar Bottom', 'Bottom position in desktop sidebar', 'desktop', 'sidebar', 
 '{"width": 300, "height": 200, "min_width": 250, "max_width": 350}', 25.00, 
 '["video", "image", "animation"]', 8, 5, '["mp4", "webm", "jpg", "png", "gif"]', 7),

('desktop_content_top', 'Desktop Content Top', 'Top of main content area on desktop', 'desktop', 'content', 
 '{"width": 800, "height": 300, "min_width": 600, "max_width": 1000}', 40.00, 
 '["video", "image", "animation"]', 10, 5, '["mp4", "webm", "jpg", "png", "gif"]', 9),

('desktop_content_middle', 'Desktop Content Middle', 'Middle of main content area on desktop', 'desktop', 'content', 
 '{"width": 800, "height": 250, "min_width": 600, "max_width": 1000}', 35.00, 
 '["video", "image", "animation"]', 10, 5, '["mp4", "webm", "jpg", "png", "gif"]', 8),

('desktop_content_bottom', 'Desktop Content Bottom', 'Bottom of main content area on desktop', 'desktop', 'content', 
 '{"width": 800, "height": 200, "min_width": 600, "max_width": 1000}', 30.00, 
 '["video", "image", "animation"]', 10, 5, '["mp4", "webm", "jpg", "png", "gif"]', 7),

('desktop_footer_banner', 'Desktop Footer Banner', 'Banner above footer on desktop', 'desktop', 'footer', 
 '{"width": 1200, "height": 150, "min_width": 800, "max_width": 1400}', 25.00, 
 '["video", "image", "animation"]', 8, 5, '["mp4", "webm", "jpg", "png", "gif"]', 6),

-- Mobile Areas
('mobile_header_banner', 'Mobile Header Banner', 'Banner at the top of mobile pages', 'mobile', 'top', 
 '{"width": 400, "height": 150, "min_width": 300, "max_width": 500}', 20.00, 
 '["video", "image", "animation"]', 5, 5, '["mp4", "webm", "jpg", "png", "gif"]', 8),

('mobile_content_top', 'Mobile Content Top', 'Top of main content area on mobile', 'mobile', 'content', 
 '{"width": 350, "height": 200, "min_width": 300, "max_width": 400}', 18.00, 
 '["video", "image", "animation"]', 5, 5, '["mp4", "webm", "jpg", "png", "gif"]', 7),

('mobile_content_middle', 'Mobile Content Middle', 'Middle of main content area on mobile', 'mobile', 'content', 
 '{"width": 350, "height": 180, "min_width": 300, "max_width": 400}', 15.00, 
 '["video", "image", "animation"]', 5, 5, '["mp4", "webm", "jpg", "png", "gif"]', 6),

('mobile_content_bottom', 'Mobile Content Bottom', 'Bottom of main content area on mobile', 'mobile', 'content', 
 '{"width": 350, "height": 160, "min_width": 300, "max_width": 400}', 12.00, 
 '["video", "image", "animation"]', 5, 5, '["mp4", "webm", "jpg", "png", "gif"]', 5),

('mobile_footer_banner', 'Mobile Footer Banner', 'Banner above footer on mobile', 'mobile', 'footer', 
 '{"width": 400, "height": 120, "min_width": 300, "max_width": 500}', 10.00, 
 '["video", "image", "animation"]', 5, 5, '["mp4", "webm", "jpg", "png", "gif"]', 4),

-- Tablet Areas
('tablet_header_banner', 'Tablet Header Banner', 'Banner at the top of tablet pages', 'tablet', 'top', 
 '{"width": 800, "height": 180, "min_width": 600, "max_width": 1000}', 35.00, 
 '["video", "image", "animation"]', 8, 5, '["mp4", "webm", "jpg", "png", "gif"]', 8),

('tablet_sidebar_top', 'Tablet Sidebar Top', 'Top position in tablet sidebar', 'tablet', 'sidebar', 
 '{"width": 250, "height": 200, "min_width": 200, "max_width": 300}', 25.00, 
 '["video", "image", "animation"]', 6, 5, '["mp4", "webm", "jpg", "png", "gif"]', 7),

('tablet_content_top', 'Tablet Content Top', 'Top of main content area on tablet', 'tablet', 'content', 
 '{"width": 600, "height": 250, "min_width": 500, "max_width": 700}', 30.00, 
 '["video", "image", "animation"]', 8, 5, '["mp4", "webm", "jpg", "png", "gif"]', 7),

('tablet_content_middle', 'Tablet Content Middle', 'Middle of main content area on tablet', 'tablet', 'content', 
 '{"width": 600, "height": 220, "min_width": 500, "max_width": 700}', 25.00, 
 '["video", "image", "animation"]', 8, 5, '["mp4", "webm", "jpg", "png", "gif"]', 6),

('tablet_footer_banner', 'Tablet Footer Banner', 'Banner above footer on tablet', 'tablet', 'footer', 
 '{"width": 800, "height": 140, "min_width": 600, "max_width": 1000}', 20.00, 
 '["video", "image", "animation"]', 6, 5, '["mp4", "webm", "jpg", "png", "gif"]', 5);

-- Update existing advertisements table to add video support (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advertisements') THEN
        -- Add video-related columns to existing advertisements table
        ALTER TABLE "advertisements" 
        ADD COLUMN IF NOT EXISTS "video_url" character varying(500),
        ADD COLUMN IF NOT EXISTS "thumbnail_url" character varying(500),
        ADD COLUMN IF NOT EXISTS "duration_seconds" integer DEFAULT 5,
        ADD COLUMN IF NOT EXISTS "video_format" character varying(50),
        ADD COLUMN IF NOT EXISTS "file_size_mb" integer,
        ADD COLUMN IF NOT EXISTS "views" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "selected_area" character varying,
        ADD COLUMN IF NOT EXISTS "additional_areas" json,
        ADD COLUMN IF NOT EXISTS "hourly_rate" decimal(10,2),
        ADD COLUMN IF NOT EXISTS "duration_type" character varying,
        ADD COLUMN IF NOT EXISTS "duration_value" integer,
        ADD COLUMN IF NOT EXISTS "paid_amount" decimal(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "payment_method" character varying(100),
        ADD COLUMN IF NOT EXISTS "payment_status" character varying(100),
        ADD COLUMN IF NOT EXISTS "payment_date" timestamp,
        ADD COLUMN IF NOT EXISTS "transaction_id" character varying(200);
    END IF;
END $$;
