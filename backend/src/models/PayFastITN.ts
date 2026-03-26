import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payfast_itn_notifications')
export class PayFastITN {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  m_payment_id!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  pf_payment_id!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  payment_status!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  item_name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  item_description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount_gross!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount_fee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount_net!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_str1!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_str2!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_str3!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_str4!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_str5!: string;

  @Column({ type: 'integer', nullable: true })
  custom_int1!: number;

  @Column({ type: 'integer', nullable: true })
  custom_int2!: number;

  @Column({ type: 'integer', nullable: true })
  custom_int3!: number;

  @Column({ type: 'integer', nullable: true })
  custom_int4!: number;

  @Column({ type: 'integer', nullable: true })
  custom_int5!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name_first!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name_last!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email_address!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  merchant_id!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  token!: string;

  @Column({ type: 'date', nullable: true })
  billing_date!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  signature!: string;

  @Column({ type: 'jsonb', nullable: true })
  raw_payload!: any;

  @Column({ type: 'varchar', length: 20, default: 'received' })
  status!: string; // received, processed, failed

  @Column({ type: 'text', nullable: true })
  processing_notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
