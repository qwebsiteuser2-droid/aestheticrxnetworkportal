import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('auto_email_configs')
@Index(['id'], { unique: true })
export class AutoEmailConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true, default: 'auto-email-config' })
  config_id!: string; // Always 'auto-email-config' for single config

  @Column({ type: 'varchar', length: 500 })
  subject!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'int' })
  duration_hours!: number;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_sent?: Date;

  @Column({ type: 'timestamp', nullable: true })
  next_send?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

