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

export interface Citation {
  id: string;
  type: 'journal' | 'book' | 'website' | 'conference' | 'other';
  title: string;
  authors: string[];
  journal?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  isbn?: string;
}

@Entity('research_papers')
@Index(['doctor_id'])
@Index(['is_approved'])
@Index(['created_at'])
export class ResearchPaper {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  abstract!: string;

  @Column({ type: 'text' })
  content!: string; // Markdown content

  @Column({ type: 'jsonb' })
  citations!: Citation[];

  @Column({ type: 'varchar', length: 500, array: true, default: [] })
  image_urls!: string[];

  @Column({ type: 'varchar', length: 500, array: true, default: [] })
  tags!: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdf_file_url!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdf_file_name!: string;

  @Column({ type: 'boolean', default: false })
  is_approved!: boolean;

  @Column({ type: 'int', default: 0 })
  view_count!: number;

  @Column({ type: 'int', default: 0 })
  upvote_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  approved_at!: Date;

  @Column({ type: 'uuid', nullable: true })
  approved_by!: string;

  @Column({ type: 'text', nullable: true })
  rejection_reason!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.research_papers)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @ManyToOne(() => Doctor, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver!: Doctor;

  // Methods
  toJSON(): Partial<ResearchPaper> {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      title: this.title,
      abstract: this.abstract,
      content: this.content,
      citations: this.citations,
      image_urls: this.image_urls,
      tags: this.tags,
      pdf_file_url: this.pdf_file_url,
      pdf_file_name: this.pdf_file_name,
      is_approved: this.is_approved,
      view_count: this.view_count,
      upvote_count: this.upvote_count,
      approved_at: this.approved_at,
      approved_by: this.approved_by,
      rejection_reason: this.rejection_reason,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  toPublicJSON(): Partial<ResearchPaper> {
    return {
      id: this.id,
      title: this.title,
      abstract: this.abstract,
      content: this.content,
      citations: this.citations,
      image_urls: this.image_urls,
      tags: this.tags,
      pdf_file_url: this.pdf_file_url,
      pdf_file_name: this.pdf_file_name,
      is_approved: this.is_approved,
      view_count: this.view_count,
      upvote_count: this.upvote_count,
      approved_at: this.approved_at,
      created_at: this.created_at,
      doctor: this.doctor?.toPublicJSON() as any,
    };
  }

  toAdminJSON(): Partial<ResearchPaper> {
    return {
      ...this.toJSON(),
      doctor: this.doctor?.toJSON() as any,
      approver: this.approver?.toPublicJSON() as any,
    };
  }

  // Status methods
  approve(approvedBy: string): void {
    this.is_approved = true;
    this.approved_at = new Date();
    this.approved_by = approvedBy;
    this.rejection_reason = '';
  }

  reject(reason: string): void {
    this.is_approved = false;
    this.rejection_reason = reason;
    this.approved_at = new Date();
    this.approved_by = '';
  }

  incrementViewCount(): void {
    this.view_count += 1;
  }

  incrementUpvoteCount(): void {
    this.upvote_count += 1;
  }
}
