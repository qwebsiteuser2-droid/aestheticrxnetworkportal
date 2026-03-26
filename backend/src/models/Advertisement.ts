import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Doctor } from './Doctor';

export enum AdvertisementStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

export enum DurationType {
  DAYS = 'days',
  HOURS = 'hours',
}

@Entity('advertisements')
export class Advertisement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Doctor, doctor => (doctor as any).advertisements)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'enum', enum: DurationType })
  duration_type!: DurationType;

  @Column({ type: 'integer' })
  duration!: number;

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'time' })
  start_time!: string;

  @Column({ type: 'integer' })
  total_shows!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_cost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_rate!: number;

  @Column({ type: 'enum', enum: AdvertisementStatus, default: AdvertisementStatus.PENDING })
  status!: AdvertisementStatus;

  @Column({ type: 'text', nullable: true })
  admin_notes!: string;

  @Column({ type: 'integer', default: 0 })
  views!: number;

  @Column({ type: 'integer', default: 0 })
  clicks!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
