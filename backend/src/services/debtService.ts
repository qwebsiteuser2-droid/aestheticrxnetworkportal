import { AppDataSource } from '../db/data-source';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';

export interface DebtStatus {
  currentDebt: number;
  debtLimit: number;
  canPlaceOrder: boolean;
  remainingLimit: number;
  tierName: string;
  isOverLimit: boolean;
}

/** Minimum debt limit when tier config is missing or set to 0 in the database */
const DEFAULT_DEBT_LIMIT = 50000;

export class DebtService {
  /**
   * Resolve a usable debt limit from tier config (never return 0 for active tiers)
   */
  private static resolveDebtLimitFromTierConfig(tierConfig: TierConfig | null, tierName: string): number {
    if (!tierConfig) {
      console.warn(`⚠️ No tier config for "${tierName}", using default debt limit PKR ${DEFAULT_DEBT_LIMIT}`);
      return DEFAULT_DEBT_LIMIT;
    }

    const configured = Number(tierConfig.debt_limit);
    if (configured > 0) {
      return configured;
    }

    const fromThreshold = Math.max(DEFAULT_DEBT_LIMIT, (Number(tierConfig.threshold) || 0) * 0.1);
    console.warn(
      `⚠️ Tier "${tierName}" has debt_limit 0/null — using PKR ${fromThreshold} (10% of threshold or minimum)`
    );
    return fromThreshold;
  }

  /**
   * Calculate current debt for a user
   */
  static async calculateUserDebt(doctorId: string): Promise<number> {
    try {
      const orderRepository = AppDataSource.getRepository(Order);
      
      // Get all orders for this doctor (matching admin page logic)
      // The admin page considers an order "pending" (and thus debt) if:
      // 1. payment_status === 'pending' OR payment_status is NULL
      // 2. payment_amount is NULL or 0
      // 3. payment_status !== 'paid' OR (payment_amount exists but < order_total)
      // 4. Order is not completed or cancelled
      const orders = await orderRepository.find({
        where: { doctor_id: doctorId }
      });

      let totalDebt = 0;

      for (const order of orders) {
        // Skip completed and cancelled orders
        if (order.status === 'completed' || order.status === 'cancelled') {
          continue;
        }

        const orderTotal = Number(order.order_total) || 0;
        const paidAmount = Number(order.payment_amount) || 0;
        
        // Determine payment status using same logic as admin page (orderManagementController.ts lines 46-53)
        // An order is "completed" if: payment_status === 'paid' AND payment_completed_at exists
        // An order is "pending" if: payment_status === 'pending' OR !payment_amount
        // An order is "partial" if: payment_amount > 0 AND payment_amount < order_total
        
        // Skip fully paid and completed orders (matches admin page "completed" logic)
        if (order.payment_status === 'paid' && order.payment_completed_at) {
          continue; // Fully paid, no debt
        }
        
        // Calculate remaining amount
        const remainingAmount = orderTotal - paidAmount;
        
        // Count as debt if there's remaining amount AND order is not fully paid
        // This includes:
        // - Pending orders (payment_status='pending' or no payment_amount)
        // - Partially paid orders (payment_amount > 0 but < order_total)
        // - Orders with payment_status != 'paid' or no payment_completed_at
        if (remainingAmount > 0) {
          totalDebt += remainingAmount;
          console.log(`   Order ${order.order_number}: status=${order.status}, payment_status=${order.payment_status || 'NULL'}, payment_amount=${paidAmount}, order_total=${orderTotal}, remaining=${remainingAmount}, debt=${remainingAmount}`);
        }
      }

      console.log(`   Total debt for doctor ${doctorId}: ${totalDebt} PKR`);
      return totalDebt;
    } catch (error: unknown) {
      console.error('Error calculating user debt:', error);
      return 0;
    }
  }

  /**
   * Get debt limit for a user's tier
   */
  static async getDebtLimitForTier(tierName: string): Promise<number> {
    try {
      const tierConfigRepository = AppDataSource.getRepository(TierConfig);
      
      const tierConfig = await tierConfigRepository.findOne({
        where: { 
          name: tierName,
          is_active: true 
        }
      });

      return this.resolveDebtLimitFromTierConfig(tierConfig, tierName);
    } catch (error: unknown) {
      console.error('Error getting debt limit for tier:', error);
      return DEFAULT_DEBT_LIMIT;
    }
  }

  /**
   * Check if user can place a new order
   */
  static async canUserPlaceOrder(doctorId: string): Promise<DebtStatus> {
    try {
      const doctorRepository = AppDataSource.getRepository(Doctor);
      const doctor = await doctorRepository.findOne({ where: { id: doctorId } });

      if (!doctor) {
        return {
          currentDebt: 0,
          debtLimit: 0,
          canPlaceOrder: false,
          remainingLimit: 0,
          tierName: 'Unknown',
          isOverLimit: true
        };
      }

      const currentDebt = await this.calculateUserDebt(doctorId);
      const tierName = doctor.tier || 'Lead Starter';

      // Check if admin has overridden the debt limit
      if (doctor.admin_debt_override && doctor.custom_debt_limit != null) {
        let customLimit = Number(doctor.custom_debt_limit);
        if (customLimit <= 0) {
          customLimit = await this.getDebtLimitForTier(tierName);
        }

        return {
          currentDebt,
          debtLimit: customLimit,
          canPlaceOrder: currentDebt < customLimit,
          remainingLimit: Math.max(0, customLimit - currentDebt),
          tierName,
          isOverLimit: currentDebt >= customLimit
        };
      }

      // Use tier-based debt limit
      const debtLimit = await this.getDebtLimitForTier(tierName);

      return {
        currentDebt,
        debtLimit,
        canPlaceOrder: currentDebt < debtLimit,
        remainingLimit: Math.max(0, debtLimit - currentDebt),
        tierName,
        isOverLimit: currentDebt >= debtLimit
      };
    } catch (error: unknown) {
      console.error('Error checking if user can place order:', error);
      return {
        currentDebt: 0,
        debtLimit: DEFAULT_DEBT_LIMIT,
        canPlaceOrder: true,
        remainingLimit: DEFAULT_DEBT_LIMIT,
        tierName: 'Unknown',
        isOverLimit: false
      };
    }
  }

  /**
   * Initialize default debt thresholds for existing tiers
   */
  static async initializeDefaultDebtThresholds(): Promise<void> {
    try {
      const tierConfigRepository = AppDataSource.getRepository(TierConfig);
      const tiers = await tierConfigRepository.find({
        where: { is_active: true }
      });

      for (const tier of tiers) {
        if (tier.debt_limit === null || tier.debt_limit === undefined) {
          const threshold = Number(tier.threshold) || 0;
          tier.debt_limit = Math.max(50000, threshold * 0.1);
          await tierConfigRepository.save(tier);
        }
      }
    } catch (error: unknown) {
      console.error('Error initializing default debt thresholds:', error);
    }
  }

  /**
   * Update debt limit for a specific tier
   */
  static async updateDebtLimit(tierName: string, newLimit: number): Promise<void> {
    try {
      const tierConfigRepository = AppDataSource.getRepository(TierConfig);
      const tier = await tierConfigRepository.findOne({
        where: { name: tierName }
      });

      if (tier) {
        tier.debt_limit = newLimit;
        await tierConfigRepository.save(tier);
      }
    } catch (error: unknown) {
      console.error('Error updating debt limit:', error);
    }
  }

  /**
   * Set custom debt limit for a specific user (admin override)
   */
  static async setCustomDebtLimit(doctorId: string, customLimit: number): Promise<void> {
    try {
      const doctorRepository = AppDataSource.getRepository(Doctor);
      
      const doctor = await doctorRepository.findOne({ where: { id: doctorId } });
      if (doctor) {
        doctor.custom_debt_limit = customLimit;
        doctor.admin_debt_override = true;
        await doctorRepository.save(doctor);
      }
    } catch (error: unknown) {
      console.error('Error setting custom debt limit:', error);
    }
  }

  /**
   * Remove custom debt limit for a user (revert to tier-based)
   */
  static async removeCustomDebtLimit(doctorId: string): Promise<void> {
    try {
      const doctorRepository = AppDataSource.getRepository(Doctor);
      
      const doctor = await doctorRepository.findOne({ where: { id: doctorId } });
      if (doctor) {
        doctor.custom_debt_limit = undefined;
        doctor.admin_debt_override = false;
        await doctorRepository.save(doctor);
      }
    } catch (error: unknown) {
      console.error('Error removing custom debt limit:', error);
    }
  }
}
