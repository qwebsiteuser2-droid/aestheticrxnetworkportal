import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type FeaturedItemType = 'product' | 'doctor';

@Entity('featured_items')
@Index(['item_type', 'display_order'])
export class FeaturedItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  item_type!: FeaturedItemType;

  @Column({ type: 'uuid' })
  item_id!: string;

  @Column({ type: 'integer', default: 0 })
  display_order!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  toJSON() {
    return {
      id: this.id,
      item_type: this.item_type,
      item_id: this.item_id,
      display_order: this.display_order,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

