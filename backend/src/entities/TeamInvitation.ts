import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Doctor } from '../models/Doctor';
import { Team } from './Team';

@Entity('team_invitations')
export class TeamInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'uuid' })
  from_doctor_id!: string;

  @Column({ type: 'uuid' })
  to_doctor_id!: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string; // pending, accepted, rejected

  @Column({ type: 'text', nullable: true })
  message!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  responded_at!: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_doctor_id' })
  from_doctor!: Doctor;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_doctor_id' })
  to_doctor!: Doctor;
}
