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
import { Product } from './Product';

export interface OrderLocation {
  lat: number;
  lng: number;
  address: string;
}

export type OrderStatus = 'pending' | 'pending_payment' | 'accepted' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type DeliveryStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered';

@Entity('orders')
@Index(['order_number'], { unique: true })
@Index(['doctor_id'])
@Index(['product_id'])
@Index(['status'])
@Index(['created_at'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  order_number!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ type: 'uuid' })
  product_id!: string;

  @Column({ type: 'int' })
  qty!: number;

  @Column({ type: 'jsonb' })
  order_location!: OrderLocation;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  order_total!: number;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'pending_payment', 'accepted', 'completed', 'cancelled'],
    default: 'pending'
  })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'pending' })
  payment_status!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_reference!: string;

  @Column({ type: 'timestamp', nullable: true })
  payment_date!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_transaction_id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  payment_amount!: number;

  @Column({ type: 'timestamp', nullable: true })
  payment_completed_at!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancelled_reason!: string;

  // Delivery tracking fields
  @Column({ type: 'uuid', nullable: true })
  assigned_employee_id?: string; // Employee assigned to deliver this order

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'assigned', 'in_transit', 'delivered'],
    default: 'pending'
  })
  delivery_status!: DeliveryStatus;

  @Column({ type: 'timestamp', nullable: true })
  delivery_assigned_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivery_started_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivery_completed_at?: Date;

  @Column({ type: 'jsonb', nullable: true })
  delivery_location?: { lat: number; lng: number; timestamp: Date }; // Live tracking location

  @ManyToOne(() => Doctor, { nullable: true })
  @JoinColumn({ name: 'assigned_employee_id' })
  assigned_employee?: Doctor; // Employee assigned to this delivery

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.orders)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @ManyToOne(() => Product, (product) => product.orders)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  // Methods
  toJSON(): Partial<Order> {
    return {
      id: this.id,
      order_number: this.order_number,
      doctor_id: this.doctor_id,
      product_id: this.product_id,
      qty: this.qty,
      order_location: this.order_location,
      order_total: this.order_total,
      status: this.status,
      payment_status: this.payment_status,
      payment_method: this.payment_method,
      payment_reference: this.payment_reference,
      payment_date: this.payment_date,
      payment_transaction_id: this.payment_transaction_id,
      payment_amount: this.payment_amount,
      payment_completed_at: this.payment_completed_at,
      notes: this.notes,
      accepted_at: this.accepted_at,
      completed_at: this.completed_at,
      cancelled_at: this.cancelled_at,
      cancelled_reason: this.cancelled_reason,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  toPublicJSON(): Partial<Order> {
    return {
      id: this.id,
      order_number: this.order_number,
      qty: this.qty,
      order_total: this.order_total,
      status: this.status,
      notes: this.notes,
      created_at: this.created_at,
      product: this.product?.toPublicJSON() as any,
    };
  }

  toAdminJSON(): Partial<Order> {
    return {
      ...this.toJSON(),
      doctor: this.doctor?.toPublicJSON() as any,
      product: this.product?.toJSON() as any,
      assigned_employee_id: this.assigned_employee_id,
      delivery_status: this.delivery_status,
      delivery_assigned_at: this.delivery_assigned_at,
      delivery_started_at: this.delivery_started_at,
      delivery_completed_at: this.delivery_completed_at,
      delivery_location: this.delivery_location,
    };
  }

  // Status update methods
  accept(): void {
    this.status = 'accepted';
    this.accepted_at = new Date();
  }

  complete(): void {
    this.status = 'completed';
    this.completed_at = new Date();
  }

  cancel(reason?: string): void {
    this.status = 'cancelled';
    this.cancelled_at = new Date();
    this.cancelled_reason = reason || '';
  }
}
