import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { TeamMember } from './TeamMember';
import { Doctor } from '../models/Doctor';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'uuid' })
  leader_id!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_sales!: number;

  @Column({ type: 'varchar', length: 100, default: 'Lead Starter' })
  tier!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tier_progress!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  next_tier!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  remaining_amount!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leader_id' })
  leader!: Doctor;

  @OneToMany(() => TeamMember, teamMember => teamMember.team, { cascade: true })
  members!: TeamMember[];
}
