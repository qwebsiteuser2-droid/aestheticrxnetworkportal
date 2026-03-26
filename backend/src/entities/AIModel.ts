import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_models')
export class AIModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column()
  display_name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  model_id!: string; // The actual model identifier used in API calls

  @Column({ default: true })
  is_active!: boolean;

  @Column({ default: false })
  is_default!: boolean;

  @Column({ type: 'int', default: 0 })
  max_tokens!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.7 })
  temperature!: number;

  @Column({ type: 'int', default: 20 })
  max_requests_per_minute!: number;

  @Column({ nullable: true })
  provider!: string; // e.g., 'huggingface', 'openai', 'anthropic'

  @Column({ type: 'json', nullable: true })
  metadata!: any; // Additional model-specific configuration

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
