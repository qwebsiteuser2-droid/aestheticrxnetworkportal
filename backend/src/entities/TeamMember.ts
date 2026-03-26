import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Team } from './Team';
import { Doctor } from '../models/Doctor';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'boolean', default: false })
  is_leader!: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  contribution!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  joined_at!: Date;

  @ManyToOne(() => Team, team => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;
}
