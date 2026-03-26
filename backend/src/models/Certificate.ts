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

export type CertificateType = 'tier_achievement' | 'research_excellence' | 'monthly_winner' | 'special_achievement' | 'medical_qualification' | 'leadership' | 'innovation';

export type CertificateStatus = 'issued' | 'verified' | 'expired' | 'revoked';

@Entity('certificates')
@Index(['doctor_id'])
@Index(['certificate_type'])
@Index(['status'])
@Index(['issued_at'])
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ 
    type: 'enum', 
    enum: ['tier_achievement', 'research_excellence', 'monthly_winner', 'special_achievement', 'medical_qualification', 'leadership', 'innovation']
  })
  certificate_type!: CertificateType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  subtitle?: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  achievement?: string; // e.g., "Elite Lead", "Top Performer", "Research Excellence"

  @Column({ type: 'varchar', length: 50, nullable: true })
  tier_name?: string; // For tier achievement certificates

  @Column({ type: 'int', nullable: true })
  rank?: number; // For monthly winner certificates

  @Column({ type: 'varchar', length: 20, nullable: true })
  month?: string; // e.g., "January 2024"

  @Column({ type: 'int', nullable: true })
  year?: number;

  @Column({ 
    type: 'enum', 
    enum: ['issued', 'verified', 'expired', 'revoked'],
    default: 'issued'
  })
  status!: CertificateStatus;

  @Column({ type: 'timestamp', nullable: true })
  issued_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  verified_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  certificate_url?: string; // URL to the generated certificate PDF

  @Column({ type: 'varchar', length: 500, nullable: true })
  verification_code?: string; // Unique verification code

  @Column({ type: 'text', nullable: true })
  metadata?: string; // JSON string for additional data

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.certificates)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  // Methods
  toJSON(): Partial<Certificate> {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      certificate_type: this.certificate_type,
      title: this.title,
      subtitle: this.subtitle,
      description: this.description,
      achievement: this.achievement,
      tier_name: this.tier_name,
      rank: this.rank,
      month: this.month,
      year: this.year,
      status: this.status,
      issued_at: this.issued_at,
      verified_at: this.verified_at,
      expires_at: this.expires_at,
      certificate_url: this.certificate_url,
      verification_code: this.verification_code,
      metadata: this.metadata,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  toPublicJSON(): Partial<Certificate> {
    return {
      id: this.id,
      certificate_type: this.certificate_type,
      title: this.title,
      subtitle: this.subtitle,
      description: this.description,
      achievement: this.achievement,
      tier_name: this.tier_name,
      rank: this.rank,
      month: this.month,
      year: this.year,
      status: this.status,
      issued_at: this.issued_at,
      verified_at: this.verified_at,
      certificate_url: this.certificate_url,
      verification_code: this.verification_code,
      created_at: this.created_at,
    };
  }
}
