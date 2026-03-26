import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './Doctor';

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'bounced' | 'delivered';
export type EmailType = 'marketing' | 'transactional' | 'otp' | 'campaign' | 'bulk';

@Entity('email_deliveries')
@Index(['recipient_id'])
@Index(['status'])
@Index(['email_type'])
@Index(['created_at'])
@Index(['sent_at'])
export class EmailDelivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  recipient_id?: string; // User ID if available

  @Column({ type: 'varchar', length: 255 })
  recipient_email!: string;

  @Column({ type: 'varchar', length: 500 })
  subject!: string;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'sent', 'failed', 'bounced', 'delivered'],
    default: 'pending'
  })
  status!: EmailStatus;

  @Column({ 
    type: 'enum', 
    enum: ['marketing', 'transactional', 'otp', 'campaign', 'bulk'],
    default: 'marketing'
  })
  email_type!: EmailType;

  @Column({ type: 'int', default: 0 })
  retry_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  sent_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  bounced_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  failed_at?: Date;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @Column({ type: 'text', nullable: true })
  bounce_reason?: string;

  @Column({ type: 'boolean', default: false })
  is_opened?: boolean;

  @Column({ type: 'timestamp', nullable: true })
  opened_at?: Date;

  @Column({ type: 'boolean', default: false })
  is_clicked?: boolean;

  @Column({ type: 'timestamp', nullable: true })
  clicked_at?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  campaign_id?: string; // For tracking campaigns

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, { nullable: true })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Doctor;
}

