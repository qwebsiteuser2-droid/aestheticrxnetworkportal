import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { TierConfig } from '../models/TierConfig';
import { Doctor } from '../models/Doctor';
import { DebtService } from '../services/debtService';

export const getDebtThresholds = async (req: Request, res: Response) => {
  try {
    const tierRepository = AppDataSource.getRepository(TierConfig);
    const thresholds = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    res.json({
      success: true,
      data: thresholds.map((tier) => ({
        tier_name: tier.name,
        debt_limit: Number(tier.debt_limit) || 0,
        description: tier.description,
        is_active: tier.is_active
      }))
    });
  } catch (error: unknown) {
    console.error('Error fetching debt thresholds:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch debt thresholds', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const updateDebtThreshold = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tierName, debtLimit } = req.body;

    if (!tierName || debtLimit === undefined) {
      res.status(400).json({ success: false, message: 'Tier name and debt limit are required' });
      return;
    }

    await DebtService.updateDebtLimit(tierName, debtLimit);

    res.json({
      success: true,
      message: 'Debt threshold updated successfully'
    });
  } catch (error: unknown) {
    console.error('Error updating debt threshold:', error);
    res.status(500).json({ success: false, message: 'Failed to update debt threshold', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const initializeDefaultDebtThresholds = async (req: Request, res: Response) => {
  try {
    await DebtService.initializeDefaultDebtThresholds();

    res.json({
      success: true,
      message: 'Default debt thresholds initialized successfully'
    });
  } catch (error: unknown) {
    console.error('Error initializing default debt thresholds:', error);
    res.status(500).json({ success: false, message: 'Failed to initialize debt thresholds', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const checkUserDebtStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      res.status(400).json({ success: false, message: 'Doctor ID is required' });
      return;
    }

    const debtStatus = await DebtService.canUserPlaceOrder(doctorId);

    res.json({
      success: true,
      data: debtStatus
    });
  } catch (error: unknown) {
    console.error('Error checking user debt status:', error);
    res.status(500).json({ success: false, message: 'Failed to check debt status', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const setCustomDebtLimit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { customLimit } = req.body;

    if (!doctorId || customLimit === undefined) {
      res.status(400).json({ success: false, message: 'Doctor ID and custom limit are required' });
      return;
    }

    await DebtService.setCustomDebtLimit(doctorId, customLimit);

    res.json({
      success: true,
      message: 'Custom debt limit set successfully'
    });
  } catch (error: unknown) {
    console.error('Error setting custom debt limit:', error);
    res.status(500).json({ success: false, message: 'Failed to set custom debt limit', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const removeCustomDebtLimit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      res.status(400).json({ success: false, message: 'Doctor ID is required' });
      return;
    }

    await DebtService.removeCustomDebtLimit(doctorId);

    res.json({
      success: true,
      message: 'Custom debt limit removed successfully'
    });
  } catch (error: unknown) {
    console.error('Error removing custom debt limit:', error);
    res.status(500).json({ success: false, message: 'Failed to remove custom debt limit', error: (error instanceof Error ? error.message : String(error)) });
  }
};

export const getUsersWithDebt = async (req: Request, res: Response) => {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    const doctors = await doctorRepository.find({
      where: { is_approved: true, is_admin: false },
      select: ['id', 'doctor_name', 'email', 'tier', 'total_owed_amount', 'custom_debt_limit', 'admin_debt_override']
    });

    // Calculate current debt for each user
    const usersWithDebtDetailed = await Promise.all(doctors.map(async (doctor) => {
      const currentDebt = await DebtService.calculateUserDebt(doctor.id);
      const debtStatus = await DebtService.canUserPlaceOrder(doctor.id);
      return {
        ...doctor,
        currentDebt,
        debtLimit: debtStatus.debtLimit,
        isOverLimit: currentDebt >= debtStatus.debtLimit
      };
    }));
    const usersWithDebt = usersWithDebtDetailed.filter(user => user.isOverLimit);

    res.json({
      success: true,
      data: usersWithDebt
    });
  } catch (error: unknown) {
    console.error('Error fetching users with debt:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users with debt', error: (error instanceof Error ? error.message : String(error)) });
  }
};

/**
 * Sync debt thresholds with tier configurations
 * This creates/updates debt thresholds based on existing tier configurations
 */
export const syncDebtThresholdsWithTiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const tierRepository = AppDataSource.getRepository(TierConfig);
    
    // Get all active tier configurations
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    if (tiers.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No tier configurations found. Please create tiers first.'
      });
      return;
    }

    const syncedThresholds = [];

    for (const tier of tiers) {
      if (tier.debt_limit === null || tier.debt_limit === undefined) {
        const threshold = Number(tier.threshold) || 0;
        tier.debt_limit = Math.max(50000, threshold * 0.1);
        await tierRepository.save(tier);
      }
      syncedThresholds.push({
        tier_name: tier.name,
        debt_limit: Number(tier.debt_limit) || 0,
        description: tier.description
      });
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedThresholds.length} debt thresholds with tier configurations`,
      data: syncedThresholds
    });
  } catch (error: unknown) {
    console.error('Error syncing debt thresholds with tiers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync debt thresholds with tiers',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};
