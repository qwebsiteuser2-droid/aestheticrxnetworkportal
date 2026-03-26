import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AdvertisementArea } from './VideoAdvertisement';

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  ALL = 'all'
}

@Entity('advertisement_area_configs')
export class AdvertisementAreaConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: AdvertisementArea, unique: true })
  area_name!: AdvertisementArea;

  @Column({ type: 'varchar', length: 255 })
  display_name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: DeviceType })
  device_type!: DeviceType;

  @Column({ type: 'varchar', length: 100 })
  position!: string; // top, middle, bottom, sidebar, etc.

  // Dimensions and styling
  @Column({ type: 'json' })
  dimensions!: {
    width: number;
    height: number;
    min_width?: number;
    max_width?: number;
    min_height?: number;
    max_height?: number;
  };

  @Column({ type: 'json', nullable: true })
  responsive_breakpoints!: {
    mobile?: { width: number; height: number };
    tablet?: { width: number; height: number };
    desktop?: { width: number; height: number };
  } | null;

  @Column({ type: 'json', nullable: true })
  styles!: {
    background_color?: string;
    border_radius?: number;
    padding?: number;
    margin?: number;
    z_index?: number;
    border?: string;
    shadow?: string;
  } | null;

  // Pricing configuration
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_hourly_rate!: number; // Base rate per hour

  @Column({ type: 'json', nullable: true })
  pricing_tiers!: {
    peak_hours?: { rate: number; hours: string[] }; // Higher rates for peak hours
    weekend_rate?: number; // Different rate for weekends
    bulk_discount?: { hours: number; discount_percent: number }; // Bulk discounts
  } | null;

  // Capacity and limits
  @Column({ type: 'int', default: 1 })
  max_concurrent_ads!: number; // Maximum ads that can run simultaneously

  @Column({ type: 'int', default: 0 })
  current_active_ads!: number; // Current number of active ads

  @Column({ type: 'int', default: 0 })
  total_ads_served!: number; // Total ads served in this area

  // Content restrictions
  @Column({ type: 'json', nullable: true })
  allowed_content_types!: string[] | null; // ['video', 'image', 'text', 'animation']

  @Column({ type: 'int', nullable: true })
  max_file_size_mb!: number | null; // Maximum file size for video/image ads

  @Column({ type: 'int', nullable: true })
  max_duration_seconds!: number | null; // Maximum duration for video ads

  @Column({ type: 'json', nullable: true })
  allowed_formats!: string[] | null; // ['mp4', 'webm', 'jpg', 'png', 'gif']

  // Visibility and targeting
  @Column({ type: 'boolean', default: true })
  visible_to_guests!: boolean; // Show to non-authenticated users

  @Column({ type: 'boolean', default: true })
  visible_to_authenticated!: boolean; // Show to authenticated users

  @Column({ type: 'boolean', default: true })
  allow_user_selection!: boolean; // Allow users to select this area

  @Column({ type: 'boolean', default: true })
  ads_closeable!: boolean; // Whether ads in this area can be closed/dismissed by users

  @Column({ type: 'varchar', length: 50, default: 'simple' })
  display_type!: string; // 'slides' for carousel/slideshow, 'simple' for single ad display

  // Status and priority
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher number = higher priority in selection

  @Column({ type: 'text', nullable: true })
  admin_notes!: string | null;

  // Preview image for visual representation
  @Column({ type: 'text', nullable: true })
  preview_image_url!: string | null; // Screenshot/mockup showing where ad appears

  // Rotation settings
  @Column({ type: 'int', default: 5 })
  rotation_interval_seconds!: number; // How long each ad shows before rotating

  @Column({ type: 'boolean', default: true })
  auto_rotation_enabled!: boolean; // Enable automatic rotation

  // Performance metrics
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_ctr!: number; // Average click-through rate for this area

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_cpm!: number; // Average cost per mille for this area

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1.5 })
  audio_enabled_price_multiplier!: number; // Price multiplier for audio-enabled videos (e.g., 1.5 = 50% extra cost)

  @Column({ type: 'int', default: 0 })
  total_impressions!: number; // Total impressions served in this area

  @Column({ type: 'int', default: 0 })
  total_clicks!: number; // Total clicks in this area

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Helper methods
  isAvailable(): boolean {
    return this.is_active && this.current_active_ads < this.max_concurrent_ads;
  }

  getCurrentRate(): number {
    // Apply any dynamic pricing based on time, demand, etc.
    let rate = Number(this.base_hourly_rate);
    
    if (this.pricing_tiers) {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Apply peak hours pricing
      if (this.pricing_tiers.peak_hours) {
        const peakHours = this.pricing_tiers.peak_hours.hours;
        if (peakHours.includes(hour.toString())) {
          rate = Number(this.pricing_tiers.peak_hours.rate);
        }
      }
      
      // Apply weekend pricing
      if (this.pricing_tiers.weekend_rate && (day === 0 || day === 6)) {
        rate = Number(this.pricing_tiers.weekend_rate);
      }
    }
    
    return rate;
  }

  canAccommodateAd(durationHours: number, adType: string): boolean {
    // Check if area can accommodate the ad
    if (!this.isAvailable()) {
      return false;
    }
    
    // If allowed_content_types is null/undefined/empty, allow all types (no restrictions)
    if (!this.allowed_content_types || 
        (Array.isArray(this.allowed_content_types) && this.allowed_content_types.length === 0)) {
      return true; // No restrictions, allow all types
    }
    
    // Handle both array and string (JSON string) formats
    let allowedTypes: string[] = [];
    try {
      if (Array.isArray(this.allowed_content_types)) {
        allowedTypes = this.allowed_content_types.filter(t => t != null);
      } else if (typeof this.allowed_content_types === 'string') {
        const parsed = JSON.parse(this.allowed_content_types);
        allowedTypes = Array.isArray(parsed) ? parsed.filter((t: any) => t != null) : [];
      }
    } catch (e) {
      // If we can't parse, allow all types (fail open)
      console.warn(`Failed to parse allowed_content_types for area ${this.area_name}, allowing all types:`, e);
      return true;
    }
    
    // If we have no valid allowed types after parsing, allow all
    if (allowedTypes.length === 0) {
      return true;
    }
    
    // Normalize and check
    const normalizedAdType = String(adType).toLowerCase().trim();
    const normalizedAllowedTypes = allowedTypes.map(type => String(type).toLowerCase().trim());
    const isAllowed = normalizedAllowedTypes.includes(normalizedAdType);
    
    return isAllowed;
  }

  calculateCost(durationHours: number): number {
    return durationHours * this.getCurrentRate();
  }

  updateMetrics(impressions: number, clicks: number): void {
    this.total_impressions += impressions;
    this.total_clicks += clicks;
    
    // Update averages
    if (this.total_impressions > 0) {
      this.average_ctr = (this.total_clicks / this.total_impressions) * 100;
    }
  }

  incrementActiveAds(): void {
    this.current_active_ads = Math.min(this.current_active_ads + 1, this.max_concurrent_ads);
  }

  decrementActiveAds(): void {
    this.current_active_ads = Math.max(this.current_active_ads - 1, 0);
  }
}
