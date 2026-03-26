import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Doctor } from './Doctor';

export enum AdvertisementStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum AdvertisementType {
  VIDEO = 'video',
  IMAGE = 'image',
  ANIMATION = 'animation'
}

export enum AdvertisementArea {
  // Desktop Areas
  DESKTOP_HEADER_BANNER = 'desktop_header_banner',
  DESKTOP_SIDEBAR_TOP = 'desktop_sidebar_top',
  DESKTOP_SIDEBAR_BOTTOM = 'desktop_sidebar_bottom',
  DESKTOP_CONTENT_TOP = 'desktop_content_top',
  DESKTOP_CONTENT_MIDDLE = 'desktop_content_middle',
  DESKTOP_CONTENT_BOTTOM = 'desktop_content_bottom',
  DESKTOP_FOOTER_BANNER = 'desktop_footer_banner',
  
  // Mobile Areas
  MOBILE_HEADER_BANNER = 'mobile_header_banner',
  MOBILE_FOOTER_BANNER = 'mobile_footer_banner',
  MOBILE_CONTENT_TOP = 'mobile_content_top',
  MOBILE_CONTENT_MIDDLE = 'mobile_content_middle',
  MOBILE_CONTENT_BOTTOM = 'mobile_content_bottom'
}

export enum DurationType {
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks'
}

@Entity('video_advertisements')
export class VideoAdvertisement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'text', nullable: true })
  video_url!: string | null;

  @Column({ type: 'text', nullable: true })
  image_url!: string | null;

  @Column({ type: 'text', nullable: true })
  thumbnail_url!: string | null;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', length: 100 })
  selected_area!: string;

  @Column({ type: 'int' })
  duration_hours!: number;

  @Column({ type: 'timestamp', nullable: true })
  start_date!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  end_date!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  pause_until!: Date | null; // For temporary pauses - auto-resume after this date

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  payment_status!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_cost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paid_amount!: number;

  @Column({ type: 'timestamp', nullable: true })
  payment_date!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transaction_id!: string | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason!: string | null;

  @Column({ type: 'text', nullable: true })
  admin_notes!: string | null;

  @Column({ type: 'int', default: 0 })
  impressions!: number;

  @Column({ type: 'int', default: 0 })
  clicks!: number;

  @Column({ type: 'int', default: 0 })
  views!: number;

  @Column({ type: 'boolean', default: true })
  is_quitable!: boolean; // true = user can close, false = persistent

  @Column({ type: 'boolean', default: false })
  is_closed_by_user!: boolean; // tracks if user closed this ad

  @Column({ type: 'boolean', default: false })
  audio_enabled!: boolean; // Whether audio is enabled for this video advertisement

  // Optional properties for extended functionality
  // Note: These columns don't exist in the database, so we don't use @Column decorator
  // They are kept as optional properties for type safety but won't be persisted
  target_url?: string | null;

  button_text?: string | null;

  button_color?: string | null;

  background_color?: string | null;

  text_color?: string | null;

  // Note: additional_areas column doesn't exist in the database
  // It's kept as optional property for type safety but won't be persisted
  additional_areas?: string | null; // JSON array of additional areas

  // Note: These columns don't exist in the database
  // hourly_rate, duration_type, duration_value are not in the schema
  // We use duration_hours instead
  hourly_rate?: number | null;

  duration_type?: string | null;

  duration_value?: number | null;

  // Note: start_time and end_time columns don't exist in the database
  // They are kept as optional properties for type safety but won't be persisted
  start_time?: string | null;

  end_time?: string | null;

  // Note: These columns don't exist in the database
  video_format?: string | null;

  file_size_mb?: number | null;

  // Note: ctr column doesn't exist in the database
  // It's kept as optional property for type safety but won't be persisted
  ctr?: number; // Click-through rate

  // Slides/Animation support
  @Column({ type: 'jsonb', nullable: true })
  slides?: Array<{
    url: string;
    type: 'image' | 'video' | 'animation';
    title?: string;
    description?: string;
    duration?: number; // seconds
    thumbnail?: string;
  }> | null;

  @Column({ type: 'int', nullable: true, default: 1 })
  slide_count?: number | null; // Number of slides (admin configurable)

  @Column({ type: 'int', nullable: true, default: 5 })
  slide_interval_seconds?: number | null; // Seconds per slide

  @Column({ type: 'boolean', nullable: true, default: true })
  auto_slide_enabled?: boolean | null; // Enable auto-rotation

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.id)
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor;
}