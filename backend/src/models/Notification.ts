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

export type NotificationType = 
  | 'user_approved'
  | 'user_rejected'
  | 'order_placed'
  | 'order_accepted'
  | 'order_completed'
  | 'order_cancelled'
  | 'tier_up'
  | 'research_approved'
  | 'research_rejected'
  | 'monthly_report'
  | 'admin_alert'
  | 'new_message'
  | 'appointment_accepted';

export interface NotificationPayload {
  [key: string]: any;
  title?: string;
  message?: string;
  data?: any;
}

@Entity('notifications')
@Index(['recipient_id'])
@Index(['type'])
@Index(['is_sent'])
@Index(['created_at'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  recipient_id!: string;

  @Column({ 
    type: 'varchar',
    length: 50
  })
  type!: NotificationType;

  @Column({ type: 'jsonb' })
  payload!: NotificationPayload;

  @Column({ type: 'boolean', default: false })
  is_sent!: boolean;

  @Column({ type: 'boolean', default: false })
  is_read!: boolean;

  @Column({ type: 'boolean', default: false })
  email_sent!: boolean;

  @Column({ type: 'boolean', default: false })
  whatsapp_sent!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sent_at!: Date;

  @Column({ type: 'text', nullable: true })
  error_message!: string;

  @Column({ type: 'int', default: 0 })
  retry_count!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.notifications)
  @JoinColumn({ name: 'recipient_id' })
  recipient!: Doctor;

  // Methods
  toJSON(): Partial<Notification> {
    return {
      id: this.id,
      recipient_id: this.recipient_id,
      type: this.type,
      payload: this.payload,
      is_sent: this.is_sent,
      is_read: this.is_read,
      email_sent: this.email_sent,
      whatsapp_sent: this.whatsapp_sent,
      sent_at: this.sent_at,
      error_message: this.error_message,
      retry_count: this.retry_count,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  toPublicJSON(): Partial<Notification> {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      is_sent: this.is_sent,
      is_read: this.is_read,
      sent_at: this.sent_at,
      created_at: this.created_at,
    };
  }

  // Status methods
  markAsSent(): void {
    this.is_sent = true;
    this.sent_at = new Date();
  }

  markEmailSent(): void {
    this.email_sent = true;
  }

  markWhatsAppSent(): void {
    this.whatsapp_sent = true;
  }

  markAsFailed(errorMessage: string): void {
    this.error_message = errorMessage;
    this.retry_count += 1;
  }

  incrementRetryCount(): void {
    this.retry_count += 1;
  }

  // Static factory methods
  static createUserApproved(recipientId: string, doctorName: string): Notification {
    const notification = new Notification();
    notification.recipient_id = recipientId;
    notification.type = 'user_approved';
    notification.payload = {
      title: 'Account Approved',
      message: `Congratulations ${doctorName}! Your account has been approved and you can now access all features.`,
      data: { doctorName }
    };
    return notification;
  }

  static createUserRejected(recipientId: string, reason: string): Notification {
    const notification = new Notification();
    notification.recipient_id = recipientId;
    notification.type = 'user_rejected';
    notification.payload = {
      title: 'Account Rejected',
      message: `Your account registration was rejected. Reason: ${reason}`,
      data: { reason }
    };
    return notification;
  }

  static createOrderPlaced(recipientId: string, orderNumber: string, productName: string): Notification {
    const notification = new Notification();
    notification.recipient_id = recipientId;
    notification.type = 'order_placed';
    notification.payload = {
      title: 'New Order Placed',
      message: `New order #${orderNumber} for ${productName} has been placed and is awaiting approval.`,
      data: { orderNumber, productName }
    };
    return notification;
  }

  static createTierUp(recipientId: string, newTier: string, clinicName: string): Notification {
    const notification = new Notification();
    notification.recipient_id = recipientId;
    notification.type = 'tier_up';
    notification.payload = {
      title: 'Tier Advancement!',
      message: `Congratulations! ${clinicName} has advanced to ${newTier} tier!`,
      data: { newTier, clinicName }
    };
    return notification;
  }

  static createResearchApproved(recipientId: string, paperTitle: string): Notification {
    const notification = new Notification();
    notification.recipient_id = recipientId;
    notification.type = 'research_approved';
    notification.payload = {
      title: 'Research Paper Approved',
      message: `Your research paper "${paperTitle}" has been approved and is now public.`,
      data: { paperTitle }
    };
    return notification;
  }

  static createAppointmentAccepted(
    recipientId: string, 
    doctorName: string,
    doctorContact: {
      email?: string;
      whatsapp?: string;
      clinic_name?: string;
      address?: string;
    }
  ): Notification {
    const notification = new Notification();
    notification.recipient_id = recipientId;
    notification.type = 'appointment_accepted';
    notification.payload = {
      title: 'Appointment Request Accepted!',
      message: `Dr. ${doctorName} has accepted your appointment request. You can now contact them directly.`,
      doctor_contact: doctorContact,
      data: { doctorName, doctorContact }
    };
    return notification;
  }
}
