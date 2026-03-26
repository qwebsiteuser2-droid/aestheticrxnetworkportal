import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Doctor } from '../models/Doctor';
import { AdvertisementPlacement } from './AdvertisementPlacement';

export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

@Entity('advertisement_applications')
export class AdvertisementApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  target_url!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  button_text!: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  button_color!: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  background_color!: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  text_color!: string;

  @Column({ type: 'int' })
  budget!: number; // Budget in PKR

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'date' })
  end_date!: Date;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status!: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason!: string;

  @Column({ type: 'text', nullable: true })
  admin_notes!: string;

  @Column({ type: 'json', nullable: true })
  requested_placements!: string[]; // Array of placement IDs user requested

  @Column({ type: 'uuid', nullable: true })
  approved_placement_id!: string; // Admin-approved placement

  @ManyToOne(() => AdvertisementPlacement, placement => placement.id)
  @JoinColumn({ name: 'approved_placement_id' })
  approved_placement!: AdvertisementPlacement;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @ManyToOne(() => Doctor, doctor => doctor.id)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ type: 'uuid', nullable: true })
  advertisement_id!: string; // If application is approved and converted to advertisement

  @Column({ type: 'text', nullable: true })
  contact_preferences!: string; // User's contact preferences

  @Column({ type: 'boolean', default: false })
  placement_change_notified!: boolean; // Whether user was notified of placement changes

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
