import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Doctor } from './Doctor';
import { ResearchBenefitConfig } from './ResearchBenefitConfig';
import { ResearchPaper } from './ResearchPaper';

export type RewardStatus = 'eligible' | 'delivered' | 'cancelled';

@Entity('research_reward_eligibility')
@Index(['doctor_id'])
@Index(['status'])
@Index(['benefit_config_id'])
export class ResearchRewardEligibility {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'uuid' })
  benefit_config_id!: string;

  @Column({ type: 'uuid', nullable: true })
  research_paper_id!: string | null; // Which research paper earned this reward

  @Column({ type: 'int' })
  approval_count!: number;

  @Column({ type: 'boolean', default: true })
  is_eligible!: boolean;

  @Column({ 
    type: 'enum', 
    enum: ['eligible', 'delivered', 'cancelled'],
    default: 'eligible'
  })
  status!: RewardStatus;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  delivered_by!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.id)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @ManyToOne(() => ResearchBenefitConfig, (config) => config.id)
  @JoinColumn({ name: 'benefit_config_id' })
  benefit_config!: ResearchBenefitConfig;

  @ManyToOne(() => Doctor, { nullable: true })
  @JoinColumn({ name: 'delivered_by' })
  delivered_by_doctor!: Doctor;

  @ManyToOne(() => ResearchPaper, { nullable: true })
  @JoinColumn({ name: 'research_paper_id' })
  research_paper!: ResearchPaper;

  toJSON() {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      benefit_config_id: this.benefit_config_id,
      research_paper_id: this.research_paper_id,
      approval_count: this.approval_count,
      is_eligible: this.is_eligible,
      status: this.status,
      delivered_at: this.delivered_at,
      delivered_by: this.delivered_by,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
      doctor: this.doctor?.toPublicJSON(),
      benefit_config: this.benefit_config?.toJSON(),
      delivered_by_doctor: this.delivered_by_doctor?.toPublicJSON(),
      research_paper: this.research_paper ? {
        id: this.research_paper.id,
        title: this.research_paper.title,
        upvote_count: this.research_paper.upvote_count
      } : null
    };
  }
}
