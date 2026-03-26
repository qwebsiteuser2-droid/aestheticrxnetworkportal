import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Doctor } from '../models/Doctor';
import { AdvertisementPlacement } from './AdvertisementPlacement';

export enum AdvertisementStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum AdvertisementType {
  BANNER = 'banner',
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  INTERACTIVE = 'interactive'
}

@Entity('advertisements')
export class Advertisement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'enum', enum: AdvertisementType })
  type!: AdvertisementType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  video_url!: string;

  @Column({ type: 'text', nullable: true })
  content!: string; // For text-based ads

  @Column({ type: 'varchar', length: 500, nullable: true })
  target_url!: string; // Where the ad should link to

  @Column({ type: 'varchar', length: 100, nullable: true })
  button_text!: string; // Call-to-action button text

  @Column({ type: 'varchar', length: 7, nullable: true })
  button_color!: string; // Hex color for button

  @Column({ type: 'varchar', length: 7, nullable: true })
  background_color!: string; // Hex color for background

  @Column({ type: 'varchar', length: 7, nullable: true })
  text_color!: string; // Hex color for text

  @Column({ type: 'int', default: 0 })
  budget!: number; // Budget in PKR

  @Column({ type: 'int', default: 0 })
  spent!: number; // Amount spent so far

  @Column({ type: 'int', default: 0 })
  impressions!: number; // Number of times ad was shown

  @Column({ type: 'int', default: 0 })
  clicks!: number; // Number of clicks on the ad

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'date' })
  end_date!: Date;

  @Column({ type: 'enum', enum: AdvertisementStatus, default: AdvertisementStatus.PENDING })
  status!: AdvertisementStatus;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'boolean', default: false })
  admin_override_placement!: boolean; // Whether admin changed the placement

  @Column({ type: 'varchar', length: 200, nullable: true })
  admin_placement_notes!: string; // Notes about placement changes

  @Column({ type: 'text', nullable: true })
  rejection_reason!: string; // Reason for rejection if applicable

  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher priority ads are shown first

  @Column({ type: 'json', nullable: true })
  targeting!: {
    age_range?: { min: number; max: number };
    location?: string[];
    interests?: string[];
    user_tier?: string[];
  };

  @Column({ type: 'json', nullable: true })
  schedule!: {
    days_of_week?: number[]; // 0-6 (Sunday-Saturday)
    hours?: { start: number; end: number }[]; // 0-23
    timezone?: string;
  };

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @ManyToOne(() => Doctor, doctor => doctor.id)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ type: 'uuid' })
  placement_id!: string;

  @ManyToOne(() => AdvertisementPlacement, placement => placement.id)
  @JoinColumn({ name: 'placement_id' })
  placement!: AdvertisementPlacement;

  @Column({ type: 'uuid', nullable: true })
  requested_placement_id!: string | null; // User's requested placement

  @ManyToOne(() => AdvertisementPlacement, placement => placement.id)
  @JoinColumn({ name: 'requested_placement_id' })
  requested_placement!: AdvertisementPlacement;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
