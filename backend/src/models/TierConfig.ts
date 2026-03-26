import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tier_configs')
export class TierConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  threshold!: number;

  @Column({ type: 'varchar', length: 50 })
  color!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  benefits!: string;

  @Column({ type: 'varchar', length: 10 })
  icon!: string;

  @Column({ type: 'int', default: 0 })
  display_order!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  debt_limit?: number;

  // Motivational message fields
  @Column({ type: 'text', nullable: true })
  achievement_message?: string; // Message when user reaches this tier

  @Column({ type: 'text', nullable: true })
  progress_message_25?: string; // Message at 25% progress

  @Column({ type: 'text', nullable: true })
  progress_message_50?: string; // Message at 50% progress

  @Column({ type: 'text', nullable: true })
  progress_message_75?: string; // Message at 75% progress

  @Column({ type: 'text', nullable: true })
  progress_message_90?: string; // Message at 90% progress

  @Column({ type: 'text', nullable: true })
  max_tier_message?: string; // Message when this is the highest tier

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Methods
  toJSON(): Partial<TierConfig> {
    return {
      id: this.id,
      name: this.name,
      threshold: this.threshold,
      color: this.color,
      description: this.description,
      benefits: this.benefits,
      icon: this.icon,
      display_order: this.display_order,
      is_active: this.is_active,
      debt_limit: this.debt_limit,
      achievement_message: this.achievement_message,
      progress_message_25: this.progress_message_25,
      progress_message_50: this.progress_message_50,
      progress_message_75: this.progress_message_75,
      progress_message_90: this.progress_message_90,
      max_tier_message: this.max_tier_message,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
