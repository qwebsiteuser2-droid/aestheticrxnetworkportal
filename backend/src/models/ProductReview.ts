import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from './Product';

@Entity('product_reviews')
@Index(['product_id'])
export class ProductReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  product_id!: string;

  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @Column({ type: 'varchar', length: 255 })
  author_name!: string;

  @Column({ type: 'int', default: 5 })
  rating!: number;

  @Column({ type: 'text' })
  comment!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  toJSON() {
    return {
      id: this.id,
      product_id: this.product_id,
      user_id: this.user_id,
      author_name: this.author_name,
      rating: this.rating,
      comment: this.comment,
      created_at: this.created_at,
    };
  }
}
