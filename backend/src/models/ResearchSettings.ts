import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('research_settings')
export class ResearchSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  setting_key!: string;

  @Column({ type: 'text' })
  setting_value!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  toJSON() {
    return {
      id: this.id,
      setting_key: this.setting_key,
      setting_value: this.setting_value,
      description: this.description,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
