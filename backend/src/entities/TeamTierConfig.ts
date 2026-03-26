import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_tier_configs')
export class TeamTierConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  benefits!: string;

  @Column({ type: 'varchar', length: 10 })
  icon!: string;

  @Column({ type: 'varchar', length: 50 })
  color!: string;

  // Base threshold for individual user (what one person needs to reach this tier)
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  individual_threshold!: number;

  // Maximum team members allowed for this tier
  @Column({ type: 'integer', default: 3 })
  max_members!: number;

  // Configurable discount percentages for different team sizes
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.00 })
  discount_2_members!: number; // Discount percentage for 2-member teams

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
  discount_3_members!: number; // Discount percentage for 3-member teams

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.00 })
  discount_4_members!: number; // Discount percentage for 4+ member teams

  // Display order for sorting
  @Column({ type: 'integer', default: 0 })
  display_order!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  // Helper method to calculate team threshold based on team size
  calculateTeamThreshold(teamSize: number): number {
    return this.individual_threshold * teamSize;
  }

  // Helper method to calculate discount percentage based on team size
  calculateDiscountPercentage(teamSize: number): number {
    // Use configurable discount percentages
    if (teamSize === 2) return this.discount_2_members;
    if (teamSize === 3) return this.discount_3_members;
    if (teamSize >= 4) return this.discount_4_members + (teamSize - 4) * 5; // 4+ members get base discount + 5% per additional member
    return 0; // No discount for single member
  }

  // Helper method to calculate final team price with discount
  calculateTeamPrice(teamSize: number): number {
    const basePrice = this.calculateTeamThreshold(teamSize);
    const discountPercentage = this.calculateDiscountPercentage(teamSize);
    return basePrice * (1 - discountPercentage / 100);
  }

  // Helper method to get savings amount
  calculateSavings(teamSize: number): number {
    const basePrice = this.calculateTeamThreshold(teamSize);
    const finalPrice = this.calculateTeamPrice(teamSize);
    return basePrice - finalPrice;
  }

  // JSON serialization
  toJSON(): Partial<TeamTierConfig> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      benefits: this.benefits,
      icon: this.icon,
      color: this.color,
      individual_threshold: this.individual_threshold,
      max_members: this.max_members,
      discount_2_members: this.discount_2_members,
      discount_3_members: this.discount_3_members,
      discount_4_members: this.discount_4_members,
      display_order: this.display_order,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
