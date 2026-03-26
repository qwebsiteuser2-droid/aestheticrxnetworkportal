import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AdvertisementType {
  VIDEO = 'video',
  IMAGE = 'image',
  ANIMATION = 'animation',
  GENERAL = 'general',
  COMPREHENSIVE = 'comprehensive',
  COVERING = 'covering'
}

export enum DurationUnit {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

export enum PlacementArea {
  TOP_BANNER_HIGHEST_VISIBILITY = 'top_banner_highest_visibility',
  MAIN_BLUE_AREA_PRIME_REAL_ESTATE = 'main_blue_area_prime_real_estate',
  MAIN_BLUE_AREA_B2B_PLATFORM = 'main_blue_area_b2b_platform',
  PURPLE_PINK_CONTENT_AREA = 'purple_pink_content_area'
}

@Entity('advertisement_pricing_configs')
export class AdvertisementPricingConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: PlacementArea })
  placement_area!: PlacementArea;

  @Column({ type: 'enum', enum: AdvertisementType })
  advertisement_type!: AdvertisementType;

  @Column({ type: 'enum', enum: DurationUnit })
  duration_unit!: DurationUnit;

  @Column({ type: 'boolean', default: true })
  is_quitable!: boolean; // true = quitable/closable, false = non-quitable

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price!: number; // Price per unit (hour/day/week/month)

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

