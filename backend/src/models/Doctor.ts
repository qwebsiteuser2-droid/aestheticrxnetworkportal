import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Order } from './Order';
import { ResearchPaper } from './ResearchPaper';
import { Notification } from './Notification';
import { LeaderboardSnapshot } from './LeaderboardSnapshot';
import { HallOfPride } from './HallOfPride';
import { Certificate } from './Certificate';
import { Badge } from './Badge';
// import { Advertisement } from './Advertisement';

export interface GoogleLocation {
  lat: number;
  lng: number;
  address: string;
}

export enum UserType {
  DOCTOR = 'doctor',
  REGULAR = 'regular_user', // Must match database enum value
  EMPLOYEE = 'employee'
}

@Entity('doctors')
@Index(['email'], { unique: true })
@Index(['doctor_id'], { unique: true, where: 'doctor_id IS NOT NULL' })
@Index(['signup_id'], { unique: true, where: 'signup_id IS NOT NULL' })
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', unique: true, nullable: true })
  doctor_id?: number; // Only for doctors, nullable for other user types

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clinic_name?: string; // Optional for employees

  @Column({ type: 'varchar', length: 255 })
  doctor_name!: string; // Full name for all user types

  @Column({ type: 'varchar', length: 255, nullable: true })
  display_name?: string; // For leaderboard display (admin editable)

  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsapp?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  google_location?: GoogleLocation;

  @Column({ type: 'varchar', length: 50, nullable: true })
  signup_id?: string; // Only required for doctors

  @Column({ type: 'enum', enum: UserType, default: UserType.DOCTOR })
  user_type!: UserType;

  @Column({ type: 'boolean', default: false })
  is_approved!: boolean;

  @Column({ type: 'boolean', default: false })
  is_admin!: boolean;

  @Column({ type: 'boolean', default: false })
  is_deactivated!: boolean;

  @Column({ type: 'boolean', default: false })
  email_unsubscribed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  email_unsubscribed_at?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profile_photo_url?: string;

  @Column({ type: 'boolean', default: false })
  consent_flag!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  consent_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  approved_at?: Date;

  // Google OAuth fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  google_id?: string;

  @Column({ type: 'boolean', default: false })
  is_google_user!: boolean;

  @Column({ type: 'boolean', default: false })
  google_email_verified!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'Lead Starter' })
  tier!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tier_color?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  base_tier?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tier_progress!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  current_sales!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Debt management fields
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  custom_debt_limit?: number;

  @Column({ type: 'boolean', default: false })
  admin_debt_override!: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_owed_amount!: number;

  @Column({ type: 'boolean', default: false })
  debt_limit_exceeded!: boolean;

  // Online/Availability fields
  @Column({ type: 'boolean', default: false })
  is_online!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'available' })
  availability_status!: string; // available, away, busy, offline

  @Column({ type: 'timestamp', nullable: true })
  last_active_at?: Date;

  @Column({ type: 'text', array: true, nullable: true })
  specialties?: string[];

  // Relations
  @OneToMany(() => Order, (order) => order.doctor)
  orders!: Order[];

  @OneToMany(() => ResearchPaper, (research) => research.doctor)
  research_papers!: ResearchPaper[];

  @OneToMany(() => Notification, (notification) => notification.recipient)
  notifications!: Notification[];

  @OneToMany(() => LeaderboardSnapshot, (snapshot) => snapshot.doctor)
  leaderboard_snapshots!: LeaderboardSnapshot[];

  @OneToMany(() => HallOfPride, (entry) => entry.doctor)
  hall_of_pride_entries!: HallOfPride[];

  @OneToMany(() => HallOfPride, (entry) => entry.created_by_doctor)
  created_hall_of_pride_entries!: HallOfPride[];

  @OneToMany(() => Certificate, (certificate) => certificate.doctor)
  certificates!: Certificate[];

  @OneToMany(() => Badge, (badge) => badge.doctor)
  badges!: Badge[];

  // @OneToMany(() => Advertisement, (advertisement) => advertisement.doctor)
  // advertisements: Advertisement[];

  // Computed properties for backward compatibility
  get computed_current_sales(): number {
    if (!this.orders) return this.current_sales || 0;
    return this.orders
      .filter(order => ['accepted', 'completed'].includes(order.status))
      .reduce((sum, order) => sum + Number(order.order_total), 0);
  }

  // Normalize email before insert/update
  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.trim().toLowerCase();
    }
  }

  // Methods
  toJSON(): Partial<Doctor> {
    const { password_hash, ...doctorWithoutPassword } = this;
    return doctorWithoutPassword;
  }

  toPublicJSON(): Partial<Doctor> {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      email: this.email,
      clinic_name: this.clinic_name,
      doctor_name: this.doctor_name,
      display_name: this.display_name,
      whatsapp: this.whatsapp,
      bio: this.bio,
      tags: this.tags,
      profile_photo_url: this.profile_photo_url,
      tier: this.tier,
      base_tier: this.base_tier,
      current_sales: this.current_sales,
      tier_progress: this.tier_progress,
      is_approved: this.is_approved,
      is_admin: this.is_admin,
      is_deactivated: this.is_deactivated,
      user_type: this.user_type,
      is_online: this.is_online,
      availability_status: this.availability_status,
      last_active_at: this.last_active_at,
      specialties: this.specialties,
      google_location: this.google_location,
      created_at: this.created_at,
    };
  }

  // For doctor search results (minimal public info)
  toDoctorSearchJSON(): object {
    return {
      id: this.id,
      doctor_name: this.doctor_name,
      clinic_name: this.clinic_name,
      profile_photo_url: this.profile_photo_url,
      bio: this.bio,
      tags: this.tags,
      specialties: this.specialties,
      google_location: this.google_location,
      is_online: this.is_online,
      availability_status: this.availability_status,
      last_active_at: this.last_active_at,
    };
  }
}
