import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './Order';
import { Doctor } from './Doctor';

export interface InvoiceLineItem {
  qty: number;
  item: string;
  description: string;
  unitPrice: number;
}

export type InvoiceSource = 'manual' | 'order';

@Entity('invoices')
@Index(['invoice_number'], { unique: true })
@Index(['order_id'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  invoice_number!: string;

  @Column({ type: 'uuid', nullable: true })
  order_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  doctor_id!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clinic_name!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  doctor_name!: string | null;

  @Column({ type: 'date' })
  invoice_date!: string;

  @Column({ type: 'text', nullable: true })
  custom_footer!: string | null;

  @Column({ type: 'jsonb' })
  line_items!: InvoiceLineItem[];

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  grand_total!: number;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source!: InvoiceSource;

  @Column({ type: 'uuid', nullable: true })
  created_by!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @ManyToOne(() => Doctor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor;
}

@Entity('invoice_counter')
export class InvoiceCounter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', default: 2001 })
  next_number!: number;
}
