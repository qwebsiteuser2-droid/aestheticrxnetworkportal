import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Doctor } from './Doctor';
import { Message } from './Message';

export type ConversationStatus = 'pending' | 'accepted' | 'active' | 'archived' | 'blocked';

@Entity('conversations')
@Index(['doctor_id', 'user_id'], { unique: true })
@Index(['last_message_at'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: ConversationStatus;

  @Column({ type: 'timestamp', nullable: true })
  last_message_at?: Date;

  @Column({ type: 'integer', default: 0 })
  doctor_unread_count!: number;

  @Column({ type: 'integer', default: 0 })
  user_unread_count!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @ManyToOne(() => Doctor, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user!: Doctor;

  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[];

  // Methods
  toJSON(): Partial<Conversation> {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      user_id: this.user_id,
      status: this.status,
      last_message_at: this.last_message_at,
      doctor_unread_count: this.doctor_unread_count,
      user_unread_count: this.user_unread_count,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  toPublicJSON(currentUserId: string): object {
    const isDoctor = currentUserId === this.doctor_id;
    const otherParty = isDoctor ? this.user : this.doctor;
    const unreadCount = isDoctor ? this.doctor_unread_count : this.user_unread_count;

    return {
      id: this.id,
      status: this.status,
      last_message_at: this.last_message_at,
      unread_count: unreadCount,
      other_party: otherParty ? {
        id: otherParty.id,
        name: otherParty.doctor_name,
        clinic_name: otherParty.clinic_name,
        profile_photo_url: otherParty.profile_photo_url,
        is_online: (otherParty as any).is_online,
        availability_status: (otherParty as any).availability_status,
      } : null,
      created_at: this.created_at,
    };
  }
}

