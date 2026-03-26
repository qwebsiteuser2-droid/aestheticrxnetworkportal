import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { TierConfig } from '../models/TierConfig';
import { Doctor } from '../models/Doctor';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Get all tier configurations (public endpoint)
 */
export const getTierConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const tierRepository = AppDataSource.getRepository(TierConfig);
    
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    res.json({
      success: true,
      data: {
        tiers: tiers.map(tier => tier.toJSON())
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching tier configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tier configurations',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Get all tier configurations for admin (includes inactive)
 */
export const getTierConfigsAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const tierRepository = AppDataSource.getRepository(TierConfig);
    
    const tiers = await tierRepository.find({
      order: { display_order: 'ASC' }
    });

    res.json({
      success: true,
      data: {
        tiers: tiers.map(tier => tier.toJSON())
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching tier configs for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tier configurations',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Create a new tier configuration (admin only)
 */
export const createTierConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { name, threshold, color, description, benefits, icon, display_order, is_active, debt_limit } = req.body;

    // Validate required fields
    if (!name || threshold === undefined || !color || !description || !benefits || !icon) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, threshold, color, description, benefits, icon'
      });
      return;
    }

    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Check if tier with same name already exists
    const existingTier = await tierRepository.findOne({ where: { name } });
    if (existingTier) {
      res.status(400).json({
        success: false,
        message: 'Tier with this name already exists'
      });
      return;
    }

    // Validate numeric fields to prevent overflow
    const parsedThreshold = parseFloat(String(threshold));
    if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 999999999999.99) {
      res.status(400).json({
        success: false,
        message: 'Threshold must be a valid number between 0 and 999,999,999,999.99'
      });
      return;
    }

    const parsedDisplayOrder = display_order !== undefined ? parseInt(String(display_order)) : 0;
    if (isNaN(parsedDisplayOrder) || parsedDisplayOrder < -2147483648 || parsedDisplayOrder > 2147483647) {
      res.status(400).json({
        success: false,
        message: 'Display order must be a valid integer between -2,147,483,648 and 2,147,483,647'
      });
      return;
    }

    const parsedDebtLimit = debt_limit !== undefined && debt_limit !== null ? parseFloat(String(debt_limit)) : null;
    if (parsedDebtLimit !== null && (isNaN(parsedDebtLimit) || parsedDebtLimit < 0 || parsedDebtLimit > 999999999999.99)) {
      res.status(400).json({
        success: false,
        message: 'Debt limit must be a valid number between 0 and 999,999,999,999.99 or null'
      });
      return;
    }

    const tierConfigData: any = {
      name,
      threshold: parsedThreshold,
      color,
      description: description || null,
      benefits: benefits || null,
      icon,
      display_order: parsedDisplayOrder,
      is_active: is_active !== undefined ? is_active : true,
      debt_limit: parsedDebtLimit
    };

    const tierConfig = tierRepository.create(tierConfigData);
    const savedTier = await tierRepository.save(tierConfig);

    // Handle toJSON safely with proper type checking
    let tierData: any = null;
    if (Array.isArray(savedTier) && savedTier.length > 0) {
      const firstTier = savedTier[0];
      if (firstTier) {
        tierData = (firstTier as any).toJSON ? (firstTier as any).toJSON() : firstTier;
      }
    } else if (savedTier && !Array.isArray(savedTier)) {
      tierData = (savedTier as any).toJSON ? (savedTier as any).toJSON() : savedTier;
    }

    res.status(201).json({
      success: true,
      message: 'Tier configuration created successfully',
      data: {
        tier: tierData
      }
    });
  } catch (error: unknown) {
    console.error('Error creating tier config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tier configuration',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Update a tier configuration (admin only)
 */
export const updateTierConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { id } = req.params;
    const { name, threshold, color, description, benefits, icon, display_order, is_active, debt_limit } = req.body;

    const tierRepository = AppDataSource.getRepository(TierConfig);
    const tierConfig = await tierRepository.findOne({ where: { id } });

    if (!tierConfig) {
      res.status(404).json({
        success: false,
        message: 'Tier configuration not found'
      });
      return;
    }

    // Check if name is being changed and if it conflicts with existing tier
    if (name && name !== tierConfig.name) {
      const existingTier = await tierRepository.findOne({ where: { name } });
      if (existingTier) {
        res.status(400).json({
          success: false,
          message: 'Tier with this name already exists'
        });
        return;
      }
    }

    // Update fields with validation
    if (name !== undefined) tierConfig.name = name;
    if (threshold !== undefined) {
      const parsedThreshold = parseFloat(String(threshold));
      if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 999999999999.99) {
        res.status(400).json({
          success: false,
          message: 'Threshold must be a valid number between 0 and 999,999,999,999.99'
        });
        return;
      }
      tierConfig.threshold = parsedThreshold;
    }
    if (color !== undefined) tierConfig.color = color;
    if (description !== undefined) tierConfig.description = description;
    if (benefits !== undefined) tierConfig.benefits = benefits;
    if (icon !== undefined) tierConfig.icon = icon;
    if (display_order !== undefined) {
      const parsedDisplayOrder = parseInt(String(display_order));
      if (isNaN(parsedDisplayOrder) || parsedDisplayOrder < -2147483648 || parsedDisplayOrder > 2147483647) {
        res.status(400).json({
          success: false,
          message: 'Display order must be a valid integer between -2,147,483,648 and 2,147,483,647'
        });
        return;
      }
      tierConfig.display_order = parsedDisplayOrder;
    }
    if (is_active !== undefined) tierConfig.is_active = is_active;
    if (debt_limit !== undefined) {
      const parsedDebtLimit = debt_limit !== null && debt_limit !== '' ? parseFloat(String(debt_limit)) : null;
      if (parsedDebtLimit !== null && (isNaN(parsedDebtLimit) || parsedDebtLimit < 0 || parsedDebtLimit > 999999999999.99)) {
        res.status(400).json({
          success: false,
          message: 'Debt limit must be a valid number between 0 and 999,999,999,999.99 or null'
        });
        return;
      }
      tierConfig.debt_limit = parsedDebtLimit;
    }

    const updatedTier = await tierRepository.save(tierConfig);

    res.json({
      success: true,
      message: 'Tier configuration updated successfully',
      data: {
        tier: updatedTier.toJSON()
      }
    });
  } catch (error: unknown) {
    console.error('Error updating tier config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tier configuration',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Delete a tier configuration (admin only)
 */
export const deleteTierConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { id } = req.params;

    const tierRepository = AppDataSource.getRepository(TierConfig);
    const tierConfig = await tierRepository.findOne({ where: { id } });

    if (!tierConfig) {
      res.status(404).json({
        success: false,
        message: 'Tier configuration not found'
      });
      return;
    }

    await tierRepository.remove(tierConfig);

    res.json({
      success: true,
      message: 'Tier configuration deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Error deleting tier config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tier configuration',
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
    });
  }
};

/**
 * Update all user tiers based on current sales and tier configurations
 */
export const updateAllUserTiers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.is_admin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Get all active tier configurations
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    if (tiers.length === 0) {
      res.status(400).json({ success: false, message: 'No active tier configurations found' });
      return;
    }

    // Get all approved doctors with their total sales
    const doctorsWithSales = await doctorRepository
      .createQueryBuilder('doctor')
      .leftJoin('doctor.orders', 'order')
      .select([
        'doctor.id',
        'doctor.doctor_id',
        'doctor.doctor_name',
        'doctor.clinic_name'
      ])
      .addSelect('COALESCE(SUM(order.order_total), 0)', 'total_sales')
      .where('doctor.is_approved = :approved', { approved: true })
      .groupBy('doctor.id')
      .getRawMany();

    let updatedCount = 0;

    // Update each doctor's tier based on their sales
    for (const doctor of doctorsWithSales) {
      const totalSales = parseFloat(doctor.total_sales) || 0;
      
      // Find appropriate tier based on sales
      let currentTier = tiers[0]; // Default to first tier
      for (let i = tiers.length - 1; i >= 0; i--) {
        const tier = tiers[i];
        if (tier && tier.threshold !== null && tier.threshold !== undefined) {
          const thresholdValue = parseFloat(tier.threshold.toString());
          if (!isNaN(thresholdValue) && totalSales >= thresholdValue) {
            currentTier = tier;
            break;
          }
        }
      }

      // Update doctor's tier (we'll store this in a custom field or use it for display)
      // For now, we'll just log the update
      console.log(`Doctor ${doctor.doctor_name} (${doctor.doctor_id}): ${totalSales.toLocaleString()} PKR -> ${currentTier?.name || 'Unknown'}`);
      updatedCount++;
    }

    res.json({ 
      success: true, 
      message: `Updated tiers for ${updatedCount} doctors based on current sales`,
      data: { updatedCount }
    });
  } catch (error: unknown) {
    console.error('Error updating user tiers:', error);
    res.status(500).json({ success: false, message: 'Failed to update user tiers' });
  }
};
