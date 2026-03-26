import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('otp_configs')
export class OTPConfig {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'userType' })
  userType!: 'regular' | 'admin';

  @Column({ type: 'integer', default: 24 })
  duration!: number; // in hours

  @Column({ type: 'varchar', length: 20, default: 'hours', name: 'durationType' })
  durationType!: 'hours' | 'days' | 'weeks' | 'months';

  @Column({ type: 'boolean', default: false, name: 'isRequired' })
  isRequired!: boolean;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
