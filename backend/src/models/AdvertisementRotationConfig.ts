import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('advertisement_rotation_configs')
export class AdvertisementRotationConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  area_name!: string;

  @Column({ type: 'int', default: 5 })
  rotation_interval_seconds!: number; // How often to rotate ads

  @Column({ type: 'int', default: 1 })
  max_concurrent_ads!: number; // How many ads to show simultaneously

  @Column({ type: 'boolean', default: true })
  auto_rotation_enabled!: boolean; // Whether to auto-rotate or manual only

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'text', nullable: true })
  admin_notes!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
