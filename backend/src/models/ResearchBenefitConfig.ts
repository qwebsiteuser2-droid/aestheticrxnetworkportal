import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type BenefitConfigType = 'gift' | 'tier_progress' | 'bonus_approvals';

@Entity('research_benefit_configs')
@Index(['approval_threshold'])
@Index(['is_active'])
export class ResearchBenefitConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string; // e.g., "Monthly Company Gift"

  @Column({ type: 'text', nullable: true })
  description!: string; // e.g., "Monthly company gift for reaching milestone"

  @Column({ type: 'int' })
  approval_threshold!: number; // e.g., 20, 50, 80, 100

  @Column({ type: 'int', nullable: true })
  approval_threshold_max!: number; // For ranges like 80-99

  @Column({ type: 'int', nullable: true })
  view_threshold!: number | null; // Optional view count threshold

  @Column({ type: 'enum', enum: ['gift', 'tier_progress', 'bonus_approvals'] })
  benefit_type!: BenefitConfigType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  benefit_value!: number; // For tier_progress: percentage, for bonus_approvals: count

  @Column({ type: 'varchar', length: 255, nullable: true })
  gift_description!: string; // For gift type

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order!: number; // For display ordering

  @Column({ type: 'varchar', length: 50, default: '#4F46E5' })
  display_color!: string; // For UI display

  // Anti-gaming controls
  @Column({ type: 'int', default: 1 })
  max_awards_per_doctor!: number; // Maximum times a doctor can receive this benefit

  @Column({ type: 'int', default: 0 })
  cooldown_days!: number; // Days between awards for same doctor

  @Column({ type: 'boolean', default: false })
  requires_manual_approval!: boolean; // Admin must manually approve

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      approval_threshold: this.approval_threshold,
      approval_threshold_max: this.approval_threshold_max,
      view_threshold: this.view_threshold,
      benefit_type: this.benefit_type,
      benefit_value: this.benefit_value,
      gift_description: this.gift_description,
      is_active: this.is_active,
      sort_order: this.sort_order,
      display_color: this.display_color,
      max_awards_per_doctor: this.max_awards_per_doctor,
      cooldown_days: this.cooldown_days,
      requires_manual_approval: this.requires_manual_approval,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

