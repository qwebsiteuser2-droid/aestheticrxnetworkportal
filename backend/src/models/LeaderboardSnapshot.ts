import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Doctor } from './Doctor';

@Entity('leaderboard_snapshots')
@Index(['doctor_id'])
@Index(['snapshot_date'])
@Index(['tier'])
export class LeaderboardSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'date' })
  snapshot_date!: Date;

  @Column({ type: 'varchar', length: 50 })
  tier!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  current_sales!: number;

  @Column({ type: 'int' })
  rank!: number;

  @Column({ type: 'int' })
  total_doctors!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  previous_sales!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  previous_tier!: string;

  @Column({ type: 'int', nullable: true })
  previous_rank!: number;

  @CreateDateColumn()
  created_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.leaderboard_snapshots)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  // Methods
  toJSON(): Partial<LeaderboardSnapshot> {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      snapshot_date: this.snapshot_date,
      tier: this.tier,
      current_sales: this.current_sales,
      rank: this.rank,
      total_doctors: this.total_doctors,
      previous_sales: this.previous_sales,
      previous_tier: this.previous_tier,
      previous_rank: this.previous_rank,
      created_at: this.created_at,
    };
  }

  toPublicJSON(): Partial<LeaderboardSnapshot> {
    return {
      id: this.id,
      snapshot_date: this.snapshot_date,
      tier: this.tier,
      current_sales: this.current_sales,
      rank: this.rank,
      total_doctors: this.total_doctors,
      previous_sales: this.previous_sales,
      previous_tier: this.previous_tier,
      previous_rank: this.previous_rank,
      created_at: this.created_at,
      doctor: this.doctor?.toPublicJSON() as any,
    };
  }

  // Computed properties
  get sales_change(): number {
    if (!this.previous_sales) return 0;
    return this.current_sales - this.previous_sales;
  }

  get rank_change(): number {
    if (!this.previous_rank) return 0;
    return this.previous_rank - this.rank; // Positive means rank improved
  }

  get tier_changed(): boolean {
    return this.previous_tier !== this.tier;
  }
}
