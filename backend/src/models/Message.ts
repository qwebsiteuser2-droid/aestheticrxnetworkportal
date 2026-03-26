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
import { Conversation } from './Conversation';

export type MessageType = 'text' | 'image' | 'file' | 'system';

@Entity('messages')
@Index(['conversation_id'])
@Index(['sender_id'])
@Index(['created_at'])
@Index(['is_read'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  conversation_id!: string;

  @Column({ type: 'uuid' })
  sender_id!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'text' })
  message_type!: MessageType;

  @Column({ type: 'boolean', default: false })
  is_read!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at?: Date;

  @CreateDateColumn()
  created_at!: Date;

  // Relations
  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @ManyToOne(() => Doctor, { eager: false })
  @JoinColumn({ name: 'sender_id' })
  sender!: Doctor;

  // Methods
  toJSON(): Partial<Message> {
    return {
      id: this.id,
      conversation_id: this.conversation_id,
      sender_id: this.sender_id,
      content: this.content,
      message_type: this.message_type,
      is_read: this.is_read,
      read_at: this.read_at,
      created_at: this.created_at,
    };
  }

  toPublicJSON(): object {
    return {
      id: this.id,
      conversation_id: this.conversation_id,
      sender_id: this.sender_id,
      content: this.content,
      message_type: this.message_type,
      is_read: this.is_read,
      read_at: this.read_at,
      created_at: this.created_at,
      sender: this.sender ? {
        id: this.sender.id,
        name: this.sender.doctor_name,
        profile_photo_url: this.sender.profile_photo_url,
      } : null,
    };
  }

  markAsRead(): void {
    this.is_read = true;
    this.read_at = new Date();
  }
}

