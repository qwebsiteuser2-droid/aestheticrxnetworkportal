import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Doctor } from './Doctor';

export type BadgeType = 'achievement' | 'milestone' | 'special';

@Entity('badges')
@Index(['doctor_id'])
@Index(['badge_type'])
@Index(['is_active'])
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ 
    type: 'enum', 
    enum: ['achievement', 'milestone', 'special'],
    default: 'achievement'
  })
  badge_type!: BadgeType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 10, default: '🏅' })
  icon!: string;

  @Column({ type: 'varchar', length: 50, default: 'blue' })
  color!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  earned_date!: Date;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'uuid', nullable: true })
  assigned_by!: string; // Admin who assigned this badge

  @Column({ type: 'text', nullable: true })
  notes!: string; // Optional notes about why badge was assigned

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.badges)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @ManyToOne(() => Doctor, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assigned_by_doctor!: Doctor;

  // Methods
  toJSON(): Partial<Badge> {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      name: this.name,
      badge_type: this.badge_type,
      description: this.description,
      icon: this.icon,
      color: this.color,
      earned_date: this.earned_date,
      is_active: this.is_active,
      assigned_by: this.assigned_by,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  toPublicJSON(): Partial<Badge> {
    return {
      id: this.id,
      name: this.name,
      badge_type: this.badge_type,
      description: this.description,
      icon: this.icon,
      color: this.color,
      earned_date: this.earned_date,
    };
  }
}

