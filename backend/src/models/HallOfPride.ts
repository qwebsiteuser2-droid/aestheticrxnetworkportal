import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Doctor } from './Doctor';

@Entity('hall_of_pride')
export class HallOfPride {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @ManyToOne(() => Doctor, doctor => doctor.hall_of_pride_entries)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url!: string;

  @Column({ type: 'varchar', length: 100 })
  achievement_type!: string; // e.g., "Excellence in Surgery", "Telemedicine Pioneer"

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  display_order!: number; // For ordering achievements

  @Column({ type: 'uuid', nullable: true })
  created_by_admin!: string; // Admin who created this entry

  @ManyToOne(() => Doctor, doctor => doctor.created_hall_of_pride_entries)
  @JoinColumn({ name: 'created_by_admin' })
  created_by_doctor!: Doctor;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  toJSON() {
    return {
      id: this.id,
      doctor: this.doctor ? {
        id: this.doctor.id,
        doctor_name: this.doctor.doctor_name,
        clinic_name: this.doctor.clinic_name,
        profile_photo_url: this.doctor.profile_photo_url,
      } : undefined,
      title: this.title,
      description: this.description,
      image_url: this.image_url,
      achievement_type: this.achievement_type,
      reason: this.reason,
      is_active: this.is_active,
      display_order: this.display_order,
      created_by_doctor: this.created_by_doctor ? {
        id: this.created_by_doctor.id,
        doctor_name: this.created_by_doctor.doctor_name,
      } : undefined,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}