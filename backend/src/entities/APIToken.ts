import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('api_tokens')
export class APIToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column()
  display_name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  provider!: string; // e.g., 'huggingface', 'openai', 'anthropic'

  @Column()
  token_value!: string; // Encrypted token

  @Column({ default: true })
  is_active!: boolean;

  @Column({ default: false })
  is_default!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata!: any; // Additional configuration like base URL, etc.

  @Column({ nullable: true })
  last_used_at!: Date;

  @Column({ nullable: true })
  last_validated_at!: Date;

  @Column({ default: false })
  is_valid!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
