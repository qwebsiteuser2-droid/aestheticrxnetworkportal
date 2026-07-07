import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Doctor } from './Doctor';

@Entity('doctor_comments')
@Index(['doctor_id'])
export class DoctorComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'uuid', nullable: true })
  author_user_id!: string | null;

  @Column({ type: 'varchar', length: 255 })
  author_name!: string;

  @Column({ type: 'text' })
  comment!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  toJSON() {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      author_user_id: this.author_user_id,
      author_name: this.author_name,
      comment: this.comment,
      created_at: this.created_at,
    };
  }
}
