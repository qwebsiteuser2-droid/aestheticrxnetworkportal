import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Doctor } from './Doctor';
import { ResearchPaper } from './ResearchPaper';

@Entity('research_paper_views')
@Index(['research_paper_id'])
@Index(['doctor_id'])
@Index(['created_at'])
// Allow multiple views from same user
export class ResearchPaperView {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  research_paper_id!: string;

  @Column({ type: 'uuid', nullable: true })
  doctor_id!: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address!: string;

  @Column({ type: 'text', nullable: true })
  user_agent!: string;

  @CreateDateColumn()
  created_at!: Date;

  // Relations
  @ManyToOne(() => ResearchPaper, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'research_paper_id' })
  research_paper!: ResearchPaper;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  // Methods
  toJSON(): Partial<ResearchPaperView> {
    return {
      id: this.id,
      research_paper_id: this.research_paper_id,
      doctor_id: this.doctor_id,
      ip_address: this.ip_address,
      user_agent: this.user_agent,
      created_at: this.created_at,
    };
  }

  toPublicJSON(): Partial<ResearchPaperView> {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      created_at: this.created_at,
    };
  }
}
