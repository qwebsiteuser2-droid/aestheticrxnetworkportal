import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('debt_thresholds')
@Index(['tier_name'], { unique: true })
export class DebtThreshold {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  tier_name!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  debt_limit!: number;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  toJSON(): Partial<DebtThreshold> {
    return {
      id: this.id,
      tier_name: this.tier_name,
      debt_limit: this.debt_limit,
      description: this.description,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
