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

export type ReportType = 'plagiarism' | 'misinformation' | 'inappropriate_content' | 'spam' | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

@Entity('research_reports')
@Index(['research_paper_id'])
@Index(['reporter_id'])
@Index(['status'])
export class ResearchReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  research_paper_id!: string;

  @Column({ type: 'uuid' })
  reporter_id!: string;

  @Column({ type: 'enum', enum: ['plagiarism', 'misinformation', 'inappropriate_content', 'spam', 'other'] })
  report_type!: ReportType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  admin_notes!: string;

  @Column({ type: 'enum', enum: ['pending', 'under_review', 'resolved', 'dismissed'], default: 'pending' })
  status!: ReportStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by!: string; // Admin who reviewed the report

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ip_address!: string;

  @Column({ type: 'text', nullable: true })
  user_agent!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => ResearchPaper, { eager: false })
  @JoinColumn({ name: 'research_paper_id' })
  research_paper!: ResearchPaper;

  @ManyToOne(() => Doctor, { eager: false })
  @JoinColumn({ name: 'reporter_id' })
  reporter!: Doctor;

  @ManyToOne(() => Doctor, { eager: false })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer!: Doctor;

  toJSON() {
    return {
      id: this.id,
      research_paper_id: this.research_paper_id,
      reporter_id: this.reporter_id,
      report_type: this.report_type,
      description: this.description,
      admin_notes: this.admin_notes,
      status: this.status,
      reviewed_by: this.reviewed_by,
      reviewed_at: this.reviewed_at,
      ip_address: this.ip_address,
      user_agent: this.user_agent,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
