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
import { ResearchPaper } from './ResearchPaper';

export type BenefitType = 'gift' | 'tier_progress' | 'bonus_approvals';

@Entity('research_benefits')
@Index(['doctor_id'])
@Index(['research_paper_id'])
@Index(['benefit_type'])
export class ResearchBenefit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'uuid' })
  research_paper_id!: string;

  @Column({ type: 'enum', enum: ['gift', 'tier_progress', 'bonus_approvals'] })
  benefit_type!: BenefitType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  benefit_value!: number; // For tier_progress: percentage, for bonus_approvals: count

  @Column({ type: 'varchar', length: 255, nullable: true })
  gift_description!: string; // For gift type

  @Column({ type: 'boolean', default: false })
  is_claimed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  claimed_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @ManyToOne(() => ResearchPaper, { eager: false })
  @JoinColumn({ name: 'research_paper_id' })
  research_paper!: ResearchPaper;

  toJSON() {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      research_paper_id: this.research_paper_id,
      benefit_type: this.benefit_type,
      benefit_value: this.benefit_value,
      gift_description: this.gift_description,
      is_claimed: this.is_claimed,
      claimed_at: this.claimed_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
