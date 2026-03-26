import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Order } from './Order';

@Entity('products')
@Index(['slot_index'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', unique: true })
  slot_index!: number; // 1-100

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url!: string;

  @Column({ type: 'text', nullable: true })
  image_data!: string | null; // Base64 encoded image data stored in database

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: number;

  @Column({ type: 'boolean', default: true })
  is_visible!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit!: string; // e.g., 'box', 'piece', 'kg'

  @Column({ type: 'int', default: 0 })
  stock_quantity!: number;

  @Column({ type: 'boolean', default: false })
  is_featured!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @OneToMany(() => Order, (order) => order.product)
  orders!: Order[];

  // Methods
  toJSON(): Partial<Product> {
    return {
      id: this.id,
      slot_index: this.slot_index,
      image_url: this.image_url,
      // DO NOT include image_data in JSON - it's too large and served via /api/images endpoint
      name: this.name,
      description: this.description,
      price: this.price,
      is_visible: this.is_visible,
      category: this.category,
      unit: this.unit,
      stock_quantity: this.stock_quantity,
      is_featured: this.is_featured,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  toPublicJSON(): Partial<Product> {
    return {
      id: this.id,
      slot_index: this.slot_index,
      image_url: this.image_url,
      // DO NOT include image_data in JSON - it's too large and served via /api/images endpoint
      name: this.name,
      description: this.description,
      price: this.price,
      category: this.category,
      unit: this.unit,
      stock_quantity: this.stock_quantity,
      is_featured: this.is_featured,
    };
  }
}
