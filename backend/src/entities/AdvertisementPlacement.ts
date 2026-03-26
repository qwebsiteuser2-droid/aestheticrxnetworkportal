import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Advertisement } from './Advertisement';

export enum PlacementType {
  HEADER = 'header',
  SIDEBAR = 'sidebar',
  CONTENT = 'content',
  FOOTER = 'footer',
  POPUP = 'popup',
  BANNER = 'banner'
}

export enum PlacementStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance'
}

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  ALL = 'all'
}

@Entity('advertisement_placements')
export class AdvertisementPlacement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'enum', enum: PlacementType })
  type!: PlacementType;

  @Column({ type: 'varchar', length: 50 })
  position!: string; // e.g., 'top-left', 'center', 'bottom-right'

  @Column({ type: 'int', default: 1 })
  max_ads!: number; // Maximum number of ads that can be displayed in this placement

  @Column({ type: 'int', default: 0 })
  current_ads!: number; // Current number of active ads in this placement

  @Column({ type: 'json', nullable: true })
  dimensions!: {
    width: number;
    height: number;
    min_width?: number;
    max_width?: number;
    min_height?: number;
    max_height?: number;
  };

  @Column({ type: 'json', nullable: true })
  styles!: {
    background_color?: string;
    border_radius?: number;
    padding?: number;
    margin?: number;
    z_index?: number;
  };

  @Column({ type: 'boolean', default: true })
  allow_user_selection!: boolean; // Whether users can select this placement when applying

  @Column({ type: 'boolean', default: true })
  visible_to_guests!: boolean; // Whether ads in this placement are visible to non-logged-in users

  @Column({ type: 'enum', enum: DeviceType, default: DeviceType.ALL })
  device_type!: DeviceType; // Which devices this placement targets

  @Column({ type: 'json', nullable: true })
  responsive_breakpoints!: {
    mobile?: { width: number; height: number };
    tablet?: { width: number; height: number };
    desktop?: { width: number; height: number };
  }; // Different dimensions for different devices

  @Column({ type: 'enum', enum: PlacementStatus, default: PlacementStatus.ACTIVE })
  status!: PlacementStatus;

  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher priority placements are shown first

  @Column({ type: 'text', nullable: true })
  admin_notes!: string;

  @OneToMany(() => Advertisement, advertisement => advertisement.placement)
  advertisements!: Advertisement[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
