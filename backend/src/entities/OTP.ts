import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Doctor } from '../models/Doctor';

@Entity('otp')
export class OTP {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 6 })
  otp_code!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ type: 'boolean', default: false })
  is_used!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  used_at!: Date;

  @Column({ type: 'varchar', length: 50, default: 'login' })
  purpose!: string;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Doctor;
}
