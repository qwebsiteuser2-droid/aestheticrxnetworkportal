import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('allowed_signup_ids')
@Index(['signup_id'], { unique: true })
@Index(['is_used'])
export class AllowedSignupId {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  signup_id!: string;

  @Column({ type: 'boolean', default: false })
  is_used!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  used_by_email!: string;

  @Column({ type: 'timestamp', nullable: true })
  used_at!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  // Methods
  toJSON(): Partial<AllowedSignupId> {
    return {
      id: this.id,
      signup_id: this.signup_id,
      is_used: this.is_used,
      used_by_email: this.used_by_email,
      used_at: this.used_at,
      notes: this.notes,
      created_at: this.created_at,
    };
  }

  toPublicJSON(): Partial<AllowedSignupId> {
    return {
      signup_id: this.signup_id,
      is_used: this.is_used,
    };
  }

  // Methods
  markAsUsed(email: string): void {
    this.is_used = true;
    this.used_by_email = email;
    this.used_at = new Date();
  }

  markAsUnused(): void {
    this.is_used = false;
    this.used_by_email = '';
    this.used_at = new Date();
  }
}
